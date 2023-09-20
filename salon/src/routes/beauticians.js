const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Beautician = require('../models/beautician');
const User = require('../models/user');
const authenticateToken = require('../middleware/authentication');
const { StatusCode: httpStatusCode } = require('../helper/httpStatusCode');

//secret key
const secretKey = 'souvik-salon';


//register the user
router.post('/register', async (req, res) => {
  try {
  const { username, password  } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({ username, password: hashedPassword });
  const savedUser = await newUser.save();

  res.status(httpStatusCode.created).json(savedUser);
  } catch (err) {
    res.status(httpStatusCode.notFound).json({ error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(httpStatusCode.unauthorized).json({ message: 'Authentication failed' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(httpStatusCode.unauthorized).json({ message: 'Authentication failed' });
    }
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });

    res.json({ token });

  } catch (error) {
    res.status(httpStatusCode.internalServerError).json({ error: err.message });
  }

});


// Create a new beautician
router.post('/beauticians', authenticateToken,  async (req, res) => {
  try {
    const newBeautician = await Beautician.create(req.body);
    res.status(httpStatusCode.created).json(newBeautician);
  } catch (error) {
    res.status(httpStatusCode.badRequest).json({ error: 'Please provide all the information that is required' });
  }
});

// Get a list of beauticians
router.get('/beauticians', async (req, res) => {
  try {
    const beauticians = await Beautician.find();
    res.json(beauticians);
  } catch (error) {
    res.status(httpStatusCode.internalServerError).json({ error: err.message });
  }
});

// list of all services
router.get('/services', async (req, res) => {
    try {
      const beauticians = await Beautician.find({});
      const allServices = [];

      beauticians.forEach((beautician) => {
        beautician.saloons.forEach((saloon) => {
          allServices.push(...saloon.services);
        });
      });

      res.json(allServices);
    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });

// Add a service to a saloon for a specific beautician
router.post('/beauticians/:beauticianId/saloons/:saloonId/services', authenticateToken, async (req, res) => {
  try {
    const beauticianId = req.params.beauticianId;
    const saloonId = req.params.saloonId;
    const service = req.body;

    const beautician = await Beautician.findById(beauticianId);
    if (!beautician) {
      return res.status(httpStatusCode.notFound).json({ error: 'no such Beautician found' });
    }

    const saloon = beautician.saloons.id(saloonId);
    if (!saloon) {
      return res.status(httpStatusCode.notFound).json({ error: 'no such Saloon found' });
    }

    saloon.services.push(service);
    await beautician.save();

    res.status(httpStatusCode.created).json(beautician);
  } catch (error) {
    res.status(httpStatusCode.notFound).json({ error: 'Invalid data' });
  }
});

// Get services for a specific beautician
router.get('/beauticians/:beauticianId/services',  async (req, res) => {
  try {
    const beauticianId = req.params.beauticianId;

    const beautician = await Beautician.findById(beauticianId);
    if (!beautician) {
      return res.status(httpStatusCode.notFound).json({ error: 'no such Beautician found' });
    }

    const allServices = beautician.saloons.reduce(
      (services, saloon) => services.concat(saloon.services),
      []
    );

    res.json(allServices);
  } catch (error) {
    res.status(httpStatusCode.internalServerError).json({ error: err.message });
  }
});

// Add a rating to a specific saloon
router.post('/beauticians/:beauticianId/saloons/:saloonId/rating', authenticateToken, async (req, res) => {
  try {
    const beauticianId = req.params.beauticianId;
    const saloonId = req.params.saloonId;
    const {rating} = req.body;

    const beautician = await Beautician.findById(beauticianId);
    if (!beautician) {
      return res.status(httpStatusCode.notFound).json({ error: 'no such Beautician found' });
    }

    const saloon = beautician.saloons.id(saloonId);
    if (!saloon) {
      return res.status(httpStatusCode.notFound).json({ error: 'no such Saloon found' });
    }

    saloon.userRating = rating;

    await beautician.save();

    res.status(httpStatusCode.created).json(beautician);
  } catch (error) {
    res.status(httpStatusCode.notFound).json({ error: 'Invalid data' });
  }
});

//Get services based on price low to high
router.get('/services/sort/low-to-high', async (req, res) => {
    try {
      const services = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $unwind: '$saloons.services',
        },
        {
          $sort: { 'saloons.services.price': 1 },
        },
        {
          $group: {
            _id: null,
            services: { $push: '$saloons.services' },
          },
        },
      ]);

      (services.length > 0) ?  res.json(services[0].services): res.json([]);

    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });

  //Get services based on price high to low
  router.get('/services/sort/high-to-low', async (req, res) => {
    try {
      const services = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $unwind: '$saloons.services',
        },
        {
          $sort: { 'saloons.services.price': -1 },
        },
        {
          $group: {
            _id: null,
            services: { $push: '$saloons.services' },
          },
        },
      ]);

      (services.length > 0) ?  res.json(services[0].services): res.json([]);

    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });

  //Get saloon search based on user rating
  router.get('/saloons/rating/search', async (req, res) => {
    try {
      const minRating = parseFloat(req.query.minRating || 0);
      const maxRating = parseFloat(req.query.maxRating || 5);
  
      const saloons = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $match: {
            'saloons.userRating': {
              $gte: minRating,
              $lte: maxRating,
            },
          },
        },
      ]);
  
      res.json(saloons);
    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });


  // search for services by name and location
router.get('/services/search', async (req, res) => {
    try {
      const serviceName = req.query.name;
      const serviceLocation = req.query.location;

      const services = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $unwind: '$saloons.services',
        },
        {
          $match: {
            'saloons.services.name': serviceName,
            'saloons.location': serviceLocation,
          },
        },
      ]);
  
      res.json(services);
    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });


  //search by type
  router.get('/services/type/search', async (req, res) => {
    const { serviceType } = req.query;
  
    try {
      const services = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $unwind: '$saloons.services',
        },
        {
          $match: {
            'saloons.services.type': serviceType,
          },
        },
      ]);

      res.json(services);
    } catch (err) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });


  //Get saloon search based on price range
  router.get('/services/price/range', async (req, res) => {
    try {
      const minRange = parseFloat(req.query.minRange);
      const maxRange = parseFloat(req.query.maxRange);
  
      const services = await Beautician.aggregate([
        {
          $unwind: '$saloons',
        },
        {
          $unwind: '$saloons.services',
        },
        {
          $match: {
            'saloons.services.price': {
              $gte: minRange,
              $lte: maxRange,
            },
          },
        },
      ]);
  
      res.json(services);
    } catch (error) {
      res.status(httpStatusCode.internalServerError).json({ error: err.message });
    }
  });


  module.exports = router;
