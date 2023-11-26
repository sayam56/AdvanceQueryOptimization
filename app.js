// app.js

const express = require('express');
const mongoose = require('mongoose');
const hospitalPriceRoutes = require('./routes/hospitalPriceRoutes');  // Ensure the correct path to hospitalPriceRoutes
const redis = require('redis');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27023/TransparencyInHospitalPrices', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  // Start the Express server after successfully connecting to MongoDB
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Create a Redis client
const client = redis.createClient({ host: 'localhost', port: 6379 });

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Middleware for parsing JSON
app.use(express.json());

// Hospital Price Routes
app.use('/hospital-prices', hospitalPriceRoutes); // Ensure correct usage of hospitalPriceRoutes

// Export the Redis client for use in other modules
module.exports = { app, client };
