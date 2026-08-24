const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer')) {
    return res.status(401).json({ message: 'No Token Provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decode.id).select('-password');
    if (!req.admin) {
      return res.status(401).json({ message: 'Admin Not Found' });
    }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token Invalid or Expired' });
  }
};

exports.optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decode.id).select('-password');
  } catch (err) {
    req.admin = undefined;
  }
  next();
};
