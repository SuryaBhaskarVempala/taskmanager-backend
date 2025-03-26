const mongoose = require('mongoose');

function connect(url) {
    // Connect to MongoDB (replace with your own connection string)
    mongoose.connect(url)
        .then(() => console.log('Connected to MongoDB'))
        .catch((err) => console.log('Error connecting to MongoDB:', err));
}

module.exports = connect;
