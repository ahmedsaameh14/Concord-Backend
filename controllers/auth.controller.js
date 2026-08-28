const Admin = require('../models/admin.model');
const catchAsync = require('../utils/catch-async.util');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/app-error');

const signToken = (admin) =>
  jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      canManageUsers: admin.canManageUsers,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!admin || !(await admin.correctPassword(password))) {
    return next(new AppError('Email or Password invalid', 401));
  }

  if (!admin.isActive) {
    return next(new AppError('Account is deactivated. Contact an administrator.', 403));
  }

  const token = signToken(admin);
  res.status(200).json({
    message: 'You are Logged In',
    token,
    user: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      canManageUsers: admin.canManageUsers,
    },
  });
});

exports.me = catchAsync(async (req, res) => {
  res.status(200).json({
    message: 'Profile retrieved successfully',
    data: req.admin,
  });
});
