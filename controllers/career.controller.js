const Career = require('../models/career.model');
const Application = require('../models/application.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const { parsePagination } = require('../utils/project-query.util');

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.listCareers = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const filter = { isActive: true };
  if (search) filter.title = { $regex: escaped(search), $options: 'i' };
  const [data, total] = await Promise.all([
    Career.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Career.countDocuments(filter),
  ]);
  res.json({ message: 'Careers retrieved successfully.', data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

exports.listAdminCareers = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const filter = search ? { title: { $regex: escaped(search), $options: 'i' } } : {};
  const [data, total] = await Promise.all([
    Career.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Career.countDocuments(filter),
  ]);
  res.json({ message: 'Careers retrieved successfully.', data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

exports.getCareer = catchAsync(async (req, res, next) => {
  const career = await Career.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!career) return next(new AppError('Career not found', 404));
  res.json({ message: 'Career retrieved successfully.', data: career });
});

exports.getAdminCareer = catchAsync(async (req, res, next) => {
  const career = await Career.findById(req.params.id).lean();
  if (!career) return next(new AppError('Career not found', 404));
  res.json({ message: 'Career retrieved successfully.', data: career });
});

exports.createCareer = catchAsync(async (req, res) => {
  const career = await Career.create(req.body);
  res.status(201).json({ message: 'Career created successfully.', data: career });
});

exports.updateCareer = catchAsync(async (req, res, next) => {
  const career = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!career) return next(new AppError('Career not found', 404));
  res.json({ message: 'Career updated successfully.', data: career });
});

exports.toggleCareerStatus = catchAsync(async (req, res, next) => {
  const career = await Career.findById(req.params.id);
  if (!career) return next(new AppError('Career not found', 404));

  career.isActive = typeof req.body.isActive === 'boolean'
    ? req.body.isActive
    : !career.isActive;
  await career.save();

  res.json({
    message: `Career ${career.isActive ? 'activated' : 'deactivated'} successfully.`,
    data: career,
  });
});

exports.deleteCareer = catchAsync(async (req, res, next) => {
  const career = await Career.findByIdAndDelete(req.params.id);
  if (!career) return next(new AppError('Career not found', 404));
  await Application.deleteMany({ career: career._id });
  res.json({ message: 'Career deleted successfully.' });
});

exports.createApplication = catchAsync(async (req, res, next) => {
  const career = await Career.findOne({ _id: req.params.id, isActive: true }).select('_id');
  if (!career) return next(new AppError('Career not found', 404));
  const application = await Application.create({ ...req.body, career: career._id });
  res.status(201).json({ message: 'Application submitted successfully.', data: application });
});

exports.listApplications = catchAsync(async (req, res, next) => {
  const career = await Career.findById(req.params.id).select('_id title');
  if (!career) return next(new AppError('Career not found', 404));
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const filter = { career: career._id };
  if (search) filter.$or = ['firstName', 'lastName', 'email'].map((field) => ({ [field]: { $regex: escaped(search), $options: 'i' } }));
  if (['Waiting', 'Accepted', 'Rejected'].includes(req.query.status)) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Application.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  res.json({ message: 'Applications retrieved successfully.', data, career, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  if (!['Waiting', 'Accepted', 'Rejected'].includes(req.body.status)) return next(new AppError('Invalid application status', 400));
  const application = await Application.findOneAndUpdate({ _id: req.params.applicationId, career: req.params.id }, { status: req.body.status }, { new: true, runValidators: true });
  if (!application) return next(new AppError('Application not found', 404));
  res.json({ message: 'Application status updated successfully.', data: application });
});

exports.deleteApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOneAndDelete({ _id: req.params.applicationId, career: req.params.id });
  if (!application) return next(new AppError('Application not found', 404));
  res.json({ message: 'Application deleted successfully.' });
});
