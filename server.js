// Basic setup
var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');

// Load environment variables from .env
require('dotenv').config();

var app = express();
var port = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Database connection error:', err.message));

// Allow CORS so that frontend and backend can run separately
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    next();
};
app.use(allowCrossDomain);

// Body parser configuration
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Base route to verify API
app.get('/api', function (req, res) {
    res.status(200).json({ message: 'OK', data: { service: 'APIed Piper' } });
});

// API routes
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// 404 fallback
app.use(function (req, res) {
    res.status(404).json({ message: 'Not found', data: null });
});

// General error handler
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: 'Server error', data: null });
});

// Start server
app.listen(port, function () {
    console.log('Server running on port ' + port);
});
