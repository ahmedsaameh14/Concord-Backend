const Admin = require('../models/admin.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const { ADMIN_ROLES } = require('../config/admin.constants');
const { toAdminResponse } = require('../utils/admin-response.util');

const isAdminActor = (actor) => actor.role === 'admin';

const canManageTarget = (actor, target) => {
  if (!target) return false;
  if (isAdminActor(actor)) return true;
  return actor.canManageUsers && target.role === 'hr';
};

const parseBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
};

exports.createAdmin = catchAsync(async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'hr').toLowerCase();
  const canManageUsers = parseBoolean(req.body.canManageUsers, false);

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email and password', 400));
  }

  if (!ADMIN_ROLES.includes(role)) {
    return next(new AppError(`Role must be one of: ${ADMIN_ROLES.join(', ')}`, 400));
  }

  if (!isAdminActor(req.admin) && role !== 'hr') {
    return next(new AppError('You can only create HR users', 403));
  }

  if (!isAdminActor(req.admin) && canManageUsers) {
    return next(new AppError('Only admins can grant user management permission', 403));
  }

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    return next(new AppError('Email already exists', 409));
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    role,
    isActive: true,
    canManageUsers: role === 'hr' ? canManageUsers : false,
  });

  res.status(201).json({
    message: 'User created successfully',
    data: toAdminResponse(admin),
  });
});

exports.getAdmins = catchAsync(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const filter = {};

  if (!isAdminActor(req.admin)) {
    filter.role = 'hr';
  }

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const admins = await Admin.find(filter).select('-password').sort({ createdAt: -1 });
  res.status(200).json({ message: 'Users retrieved successfully', data: admins });
});

exports.getAdminById = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id).select('-password');
  if (!admin) {
    return next(new AppError('User not found', 404));
  }

  if (!canManageTarget(req.admin, admin)) {
    return next(new AppError('You do not have permission to view this user', 403));
  }

  res.status(200).json({ message: 'User retrieved successfully', data: admin });
});

exports.updateAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) {
    return next(new AppError('User not found', 404));
  }

  if (!canManageTarget(req.admin, admin)) {
    return next(new AppError('You do not have permission to update this user', 403));
  }

  const name = req.body.name != null ? String(req.body.name).trim() : admin.name;
  const email =
    req.body.email != null ? String(req.body.email).toLowerCase().trim() : admin.email;
  const password = req.body.password != null ? String(req.body.password) : '';
  const role = req.body.role != null ? String(req.body.role).toLowerCase() : admin.role;
  const canManageUsers =
    req.body.canManageUsers != null
      ? parseBoolean(req.body.canManageUsers, admin.canManageUsers)
      : admin.canManageUsers;

  if (!name || !email) {
    return next(new AppError('Name and email are required', 400));
  }

  if (!ADMIN_ROLES.includes(role)) {
    return next(new AppError(`Role must be one of: ${ADMIN_ROLES.join(', ')}`, 400));
  }

  if (!isAdminActor(req.admin) && role !== 'hr') {
    return next(new AppError('You can only assign the HR role', 403));
  }

  if (!isAdminActor(req.admin) && canManageUsers !== admin.canManageUsers) {
    return next(new AppError('Only admins can change user management permission', 403));
  }

  if (email !== admin.email) {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin && !existingAdmin._id.equals(admin._id)) {
      return next(new AppError('Email already exists', 409));
    }
    admin.email = email;
  }

  admin.name = name;
  admin.role = role;
  admin.canManageUsers = role === 'hr' ? canManageUsers : false;

  if (password) {
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters', 400));
    }
    admin.password = password;
  }

  await admin.save();

  res.status(200).json({
    message: 'User updated successfully',
    data: toAdminResponse(admin),
  });
});

exports.updateAdminStatus = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) {
    return next(new AppError('User not found', 404));
  }

  if (!canManageTarget(req.admin, admin)) {
    return next(new AppError('You do not have permission to update this user', 403));
  }

  if (req.admin._id.equals(admin._id)) {
    return next(new AppError('You cannot deactivate your own account', 400));
  }

  if (typeof req.body.isActive === 'boolean') {
    admin.isActive = req.body.isActive;
  } else if (req.body.isActive != null) {
    admin.isActive = String(req.body.isActive).toLowerCase() === 'true';
  } else {
    admin.isActive = !admin.isActive;
  }

  await admin.save();

  res.status(200).json({
    message: `User ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
    data: toAdminResponse(admin),
  });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) {
    return next(new AppError('User not found', 404));
  }

  if (!canManageTarget(req.admin, admin)) {
    return next(new AppError('You do not have permission to delete this user', 403));
  }

  if (req.admin._id.equals(admin._id)) {
    return next(new AppError('You cannot remove your own account', 400));
  }

  await admin.deleteOne();
  res.status(200).json({ message: 'User deleted successfully' });
});
