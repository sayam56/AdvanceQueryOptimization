const express = require('express');
const mongoose = require('mongoose');
const hospitalPriceRoutes = require('./routes/hospitalPriceRoutes'); 

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27023/TransparencyInHospitalPrices', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});


app.use(express.json());

// Hospital Price Routes
app.use('/hospital-prices', hospitalPriceRoutes); // Ensure correct usage of hospitalPriceRoutes

module.exports = { app };
