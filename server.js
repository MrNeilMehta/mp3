const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.set('strictQuery', true);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'OK', data: { service: 'APIed Piper' } });
});
app.use(express.json());
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Not found', data: null });
});

// Error handler (generic)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Server error';
  res.status(status).json({ message, data: null });
});

app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
