const mongoose = require('mongoose');

// Schema for Service
const serviceSchema = new mongoose.Schema({
  name: String,
  duration: Number,
  price: Number,
  type: String,
  location: String,
});

// Schema for Saloon
const saloonSchema = new mongoose.Schema({
  name: String,
  location: String,
  services: [serviceSchema],
  userRating: {
    type: Number,
    default: 0,
  },
});

// Schema for Beautician
const beauticianSchema = new mongoose.Schema({
  name: String,
  specialization: String,
  saloons: [saloonSchema],
});

const Beautician = mongoose.model('Beautician', beauticianSchema);

module.exports = Beautician;
