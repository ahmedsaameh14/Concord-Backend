const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const AppError = require('../utils/app-error');

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
    if (!req.admin.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
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
    if (req.admin && !req.admin.isActive) {
      req.admin = undefined;
    }
  } catch (err) {
    req.admin = undefined;
  }
  next();
};

exports.authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.admin) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.admin.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };

exports.authorizeUsersManager = (req, res, next) => {
  if (!req.admin) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.admin.role === 'admin' || (req.admin.role === 'hr' && req.admin.canManageUsers)) {
    return next();
  }
  return next(new AppError('You do not have permission to manage users', 403));
};
