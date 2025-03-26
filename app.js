const express = require('express');
const app = express();
const connect = require('./connection/DB');
const cors = require('cors');  // Only declare this once
const User = require('./model/User');
const Task = require('./model/Task');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { setToken, getToken } = require('./Auth/Auth');
const winston = require('winston');
require('dotenv').config();

const port = process.env.PORT;
const connectionString = process.env.MONGO_URL;

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Connect to the database
connect(connectionString);

// Setup CORS - Allow requests from any origin (for debugging)
app.use(cors({
  origin: '*',  // Allow all origins (replace '*' with a specific domain in production, e.g., 'https://taskmanager-frontend-dev.netlify.app')
  methods: 'GET,POST,PUT,DELETE',  // Allow specific methods
  allowedHeaders: 'Content-Type,Authorization',  // Allow specific headers
  credentials: true,  // Allow credentials if you're using cookies or authentication tokens
}));

// Handling preflight requests (OPTIONS)
app.options('*', cors());  // Handles preflight requests for all routes

app.use(express.json());

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    if (await User.isUsernameTaken(username)) {
        logger.warn(`Username '${username}' already exists`);
        return res.status(409).json({ message: 'Username already exists' });
    }

    try {
        const user = await User.create({ username, password });

        if (user) {
            const token = setToken(user);
            logger.info(`User '${username}' successfully registered`);
            return res.status(201).json({ message: 'Successfully Registered', token });
        }

        logger.error('Failed to register user');
        return res.status(500).json({ message: 'Server Internal Error' });
    } catch (err) {
        logger.error(`Error during signup: ${err.message}`);
        return res.status(500).json({ message: 'Server Internal Error' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await User.findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = setToken(user);
            logger.info(`User '${username}' logged in successfully`);
            return res.status(200).json({ message: 'Login Successful', token });
        } else {
            logger.warn(`Invalid credentials for user '${username}'`);
            return res.status(201).json({ message: 'Bad Credentials' });
        }
    } catch (err) {
        logger.error(`Error during login: ${err.message}`);
        return res.status(500).json({ message: 'Server Internal Error' });
    }
});

// Auth Route
app.post("/auth", (req, res) => {
    const { token } = req.body;
    const user = getToken(token);

    if (user) {
        logger.info('Token validated successfully');
        return res.status(201).json({ user, valid: true });
    } else {
        logger.warn('Invalid token');
        return res.status(401).json({ user: null, valid: false });
    }
});

// Update Task Route
app.put('/updateTask/:id', async (req, res) => {
    const taskId = req.params.id;
    const updatedData = req.body;

    try {
        const taskObjectId = new mongoose.Types.ObjectId(taskId);
        const task = await Task.findById(taskObjectId);  // Find the task by ID

        if (!task) {
            logger.warn(`Task not found with ID '${taskId}'`);
            return res.status(404).json({ message: 'Task not found' });
        }

        task.set(updatedData);
        await task.save();

        logger.info(`Task with ID '${taskId}' updated successfully`);
        res.status(200).json({ message: 'Task updated successfully', task });
    } catch (err) {
        logger.error(`Error updating task with ID '${taskId}': ${err.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Delete Task Route
app.delete('/deleteTask/:id', async (req, res) => {
    const taskId = req.params.id;

    try {
        const taskObjectId = new mongoose.Types.ObjectId(taskId);
        const result = await Task.deleteOne({ _id: taskObjectId });

        if (result.deletedCount === 0) {
            logger.warn(`Task not found with ID '${taskId}'`);
            return res.status(404).json({ message: 'Task not found' });
        }

        logger.info(`Task with ID '${taskId}' deleted successfully`);
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
        logger.error(`Error deleting task with ID '${taskId}': ${err.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Create Task Route
app.post('/createTask', async (req, res) => {
    const { task, dueDate, status, priority, createdBy } = req.body;

    try {
        const newTask = await Task.create({ task, dueDate, status, priority, createdBy });

        logger.info(`Task created successfully with ID '${newTask._id}'`);
        return res.status(201).json({ message: 'Task created successfully', task: newTask });
    } catch (err) {
        logger.error(`Error creating task: ${err.message}`);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get Tasks by User ID
app.get("/tasks/:id", async (req, res) => {
    const taskId = req.params.id;

    try {
        const tasks = await Task.find({ createdBy: taskId });

        if (tasks.length === 0) {
            logger.warn(`No tasks found for user with ID '${taskId}'`);
            return res.status(200).json([]);
        }

        logger.info(`Retrieved ${tasks.length} tasks for user with ID '${taskId}'`);
        return res.status(200).json(tasks);
    } catch (err) {
        logger.error(`Error retrieving tasks for user '${taskId}': ${err.message}`);
        return res.status(500).json({ message: 'Server Error' });
    }
});

// Default Route
app.get('/', (req, res) => {
    return res.json({ msg: "hi" });
});

// Start Server
app.listen(port, () => {
    logger.info("Server started on port " + port);
});
