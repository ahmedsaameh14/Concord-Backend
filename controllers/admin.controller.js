const Admin = require('../models/admin.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');

exports.createAdmin = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return next(new AppError('Please provide email and password', 400));
	}

	const existingAdmin = await Admin.findOne({ email });
	if (existingAdmin) {
		return next(new AppError('Email already exists', 409));
	}

	const admin = await Admin.create({ email, password });
	admin.password = undefined;

	res.status(201).json({ message: 'Admin created', data: admin });
});

exports.getAdmins = catchAsync(async (req, res) => {
	const admins = await Admin.find()
	res.status(200).json({ message: 'List of admins', data: admins });
});

exports.getAdminById = catchAsync(async (req, res, next) => {
	const admin = await Admin.findById(req.params.id)

	if (!admin) {
		return next(new AppError('Admin not found', 404));
	}

	res.status(200).json({ message: 'Admin retrieved successfully', data: admin });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
	const admin = await Admin.findById(req.params.id);

	if (!admin) {
		return next(new AppError('Admin not found', 404));
	}

	if (req.admin._id.equals(admin._id)) {
		return next(new AppError('You cannot remove your own account', 400));
	}

	await admin.deleteOne();
	res.status(204).send();
});
