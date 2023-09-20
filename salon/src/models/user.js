const mongoose = require('mongoose');

// Schema for User
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model('User', userSchema);
module.exports = User;