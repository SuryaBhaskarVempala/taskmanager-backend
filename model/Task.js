const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    task: {
        type: String,
        required: true,
    },
    dueDate: {
        type: Date,
        required: true
    },
    status:{
        type: String,
        required: true
    },
    priority:{
        type: String,
        required: true
    },
    createdBy:{
        type:String,
        required:true
    }
});

const Task = mongoose.model('Task', userSchema);

module.exports = Task;
