// routes/hospitalPriceRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redis = require('redis');

let redisPort = 6379;  // Replace with your redis port
let redisHost = "127.0.0.1";  // Replace with your redis host
const client = redis.createClient({
    socket: {
        port: redisPort,
        host: redisHost,
    }
});

(async () => {
    // Connect to redis server
    await client.connect();
})();


console.log("Attempting to connect to redis");
client.on('connect', () => {
    console.log('Connected!');
});

// Log any error that may occur to the console
client.on("error", (err) => {
    console.log(`Error:${err}`);
});



// Close the connection when there is an interrupt sent from keyboard
process.on('SIGINT', () => {
    client.quit();
    console.log('redis client quit');
});

// Middleware for parsing JSON
router.use(express.json());

// Route handler function
const hospitalPriceHandler = async (req, res) => {
  try {
    const { Price } = req.body; // min price set

    const specificPrice = Number(Price);

    console.log(specificPrice);
    
    // Generate a unique cache key based on the query parameters
    const cacheKey = JSON.stringify({
      description: 'SEIZURES WITH MCC',
      state: 'AZ',
      specificPrice,
    });

    // Ensure that the Redis client is still open
    if (client.connect) {
        console.log(`We are now connected and working`);
      // Check if the result is already cached
      const cachedResult = await client.get(cacheKey);

      if (cachedResult) {
        console.log(`inside cached result`);
        // If cached result exists, send it directly
        const result = JSON.parse(cachedResult);
        res.json(result);
      } else {
        console.log(`calling mongo`);
        // If not, execute the MongoDB query
        const result = await mongoose.connection.db.collection('hospital_prices').aggregate([
          // Your aggregation pipeline here
          {
            $match: {
              description: 'SEIZURES WITH MCC',
              price: { $lte: specificPrice },
            },
          },
          {
            $lookup: {
              from: 'hospitals',
              localField: 'cms_certification_num',
              foreignField: 'cms_certification_num',
              as: 'hospital_info',
            },
          },
          {
            $unwind: '$hospital_info',
          },
          {
            $match: {
              'hospital_info.state': 'AZ',
            },
          },
          {
            $group: {
              _id: {
                hospital_name: '$hospital_info.name',
                medical_procedure: '$description',
                hospital_address: '$hospital_info.address',
                hospital_city: '$hospital_info.city',
                hospital_state: '$hospital_info.state',
                hospital_zip5: '$hospital_info.zip5',
                hospital_phone: '$hospital_info.phone_number',
              },
              maxPrice: { $max: '$price' },
            },
          },
          {
            $match: {
              maxPrice: { $lte: specificPrice },
            },
          },
          {
            $sort: {
              maxPrice: 1,
            },
          },
          {
            $project: {
              _id: 0,
              hospital_name: '$_id.hospital_name',
              medical_procedure: '$_id.medical_procedure',
              hospital_address: '$_id.hospital_address',
              hospital_city: '$_id.hospital_city',
              hospital_state: '$_id.hospital_state',
              hospital_zip5: '$_id.hospital_zip5',
              hospital_phone: '$_id.hospital_phone',
              maxPrice: 1,
            },
          },
        ]).toArray();

        // Save the result in the Redis cache with an expiration time (e.g., 1 hour)
        client.set(cacheKey, JSON.stringify(result), {
            EX: 5,
        });

        // Send the result to the client
        res.json(result);
      }
    } else {
      // If the Redis client is closed, handle it accordingly
      res.status(500).json({ error: 'Redis client is closed' });
      process.on('SIGINT', () => {
            client.quit();
            console.log('redis client quit');
        });
    }

    // Disconnect from Redis after use
    //client.quit();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Attach the route handler to the '/query' endpoint
router.get('/query', hospitalPriceHandler);

module.exports = router;
