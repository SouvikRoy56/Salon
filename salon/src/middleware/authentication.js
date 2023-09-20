const jwt = require('jsonwebtoken');

const secretKey = 'souvik-salon';
// Middleware for token authentication
const authenticateToken = (req, res, next) => {
    const tokenBearer = req.header('Authorization');

    if (!tokenBearer) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    const token = tokenBearer.split(' ')[1];

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  };
   module.exports = authenticateToken;