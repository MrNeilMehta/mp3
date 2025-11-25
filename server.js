// ===== server.js =====

// ----- Imports -----
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// ----- App setup -----
const app = express();
const port = process.env.PORT || 3000;

// ----- CORS -----
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ----- Body parsing -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== MongoDB Connection =====
mongoose.set('strictQuery', false);

mongoose
  .connect(process.env.MONGODB_URI) // modern syntax — no deprecated options
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'OK', data: { status: 'up' } });
});

// ===== Routes =====
// routes/index.js must export a function that takes (app)
require('./routes')(app);

// ===== Start Server =====
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
