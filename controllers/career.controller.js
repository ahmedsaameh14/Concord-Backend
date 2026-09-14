const Career = require('../models/career.model');
const Application = require('../models/application.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const { parsePagination } = require('../utils/project-query.util');
const { uploadDocument, privateDownloadUrl } = require('../config/cloudinary-upload');
const XLSX = require('xlsx');
const crypto = require('crypto');

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const resumeSecret = () => process.env.JWT_SECRET || process.env.CLOUD_API_SECRET || 'concord-resume-download-secret';
const resumeToken = (applicationId, expiresAt) => crypto.createHmac('sha256', resumeSecret()).update(`${applicationId}.${expiresAt}`).digest('hex');
const safeFileName = (name) => (name || 'resume').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'resume';
const resumeDownloadUrl = (req, application, lifetimeMs = 60 * 60 * 1000) => {
  const expiresAt = Date.now() + lifetimeMs;
  const token = `${expiresAt}.${resumeToken(application._id.toString(), expiresAt)}`;
  const careerId = application.career?._id || application.career;
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}/careers/${careerId}/applications/${application._id}/resume?token=${token}`;
};

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
  const career = await Career.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
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
  const career = await Career.findOne({ _id: req.params.id, isActive: true }).select('_id title');
  if (!career) return next(new AppError('Career not found', 404));
  if (!req.file) return next(new AppError('Resume is required', 400));

  let payload;
  try {
    payload = {
      ...req.body,
      educationalQualifications: JSON.parse(req.body.educationalQualifications || '[]'),
      courses: JSON.parse(req.body.courses || '[]'),
      workExperience: JSON.parse(req.body.workExperience || '[]'),
      positionAppliedFor: career.title,
      resumeUrl: await uploadDocument(req.file),
      career: career._id,
    };
  } catch (error) {
    return next(new AppError(error instanceof SyntaxError ? 'Invalid application details' : 'Unable to upload resume', 400));
  }

  const application = await Application.create(payload);
  res.status(201).json({ message: 'Application submitted successfully.', data: application });
});

exports.listApplications = catchAsync(async (req, res, next) => {
  const career = await Career.findById(req.params.id).select('_id title');
  if (!career) return next(new AppError('Career not found', 404));
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const filter = { career: career._id };
  if (search) filter.$or = ['fullName', 'email', 'phone'].map((field) => ({ [field]: { $regex: escaped(search), $options: 'i' } }));
  if (['Waiting', 'Accepted', 'Rejected'].includes(req.query.status)) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Application.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  res.json({ message: 'Applications retrieved successfully.', data, career, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

exports.getApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOne({ _id: req.params.applicationId, career: req.params.id }).populate('career', 'title').lean();
  if (!application) return next(new AppError('Application not found', 404));
  res.json({
    message: 'Application retrieved successfully.',
    data: {
      ...application,
      resumeDownloadUrl: resumeDownloadUrl(req, application),
    },
  });
});

exports.downloadApplicationResume = catchAsync(async (req, res, next) => {
  const application = await Application.findOne({ _id: req.params.applicationId, career: req.params.id }).select('resumeUrl fullName').lean();
  if (!application) return next(new AppError('Application not found', 404));

  const [expiresAt, signature] = String(req.query.token || '').split('.');
  const expected = resumeToken(application._id.toString(), expiresAt);
  const signatureBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);
  if (!expiresAt || Number(expiresAt) < Date.now() || signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return next(new AppError('Resume link is invalid or expired', 401));
  }

  const response = await fetch(privateDownloadUrl(application.resumeUrl));
  if (!response.ok) return next(new AppError('Resume file is unavailable', 404));
  const buffer = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(application.fullName)}.pdf"`);
  res.send(buffer);
});

exports.exportApplications = catchAsync(async (req, res, next) => {
  const career = await Career.findById(req.params.id).select('title');
  if (!career) return next(new AppError('Career not found', 404));
  const applications = await Application.find({ career: career._id }).sort({ createdAt: -1 }).lean();
  const rows = applications.map((application) => ({
    'Application date': application.applicationDate,
    'Full name': application.fullName,
    'Date of birth': application.dateOfBirth,
    Gender: application.gender,
    Email: application.email,
    Phone: application.phone,
    'Alternative phone': application.alternatePhone || '',
    Position: application.positionAppliedFor,
    Address: application.address,
    Country: application.country,
    City: application.city,
    Education: (application.educationalQualifications || []).map((item) => `${item.universityName} - ${item.degree} (${item.graduationDate || ''})`).join(' | '),
    Courses: (application.courses || []).map((item) => item.courseName).join(' | '),
    'Work experience': (application.workExperience || []).map((item) => `${item.jobTitle} at ${item.placeOfWork} (${item.startDate || ''} - ${item.currentlyWorking ? 'Present' : item.endDate || ''})`).join(' | '),
    'Expected salary': application.expectedSalary,
    'Resume URL': resumeDownloadUrl(req, { ...application, career: career._id }, 24 * 60 * 60 * 1000),
    Status: application.status,
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length) {
    const resumeColumn = Object.keys(rows[0]).indexOf('Resume URL');
    for (let row = 0; row < rows.length; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: resumeColumn })];
      if (cell?.v) {
        const resumeUrl = cell.v;
        cell.v = 'Download CV';
        cell.t = 's';
        cell.l = { Target: resumeUrl, Tooltip: 'Download resume PDF' };
      }
    }
  }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Applications');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${career.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-applications.xlsx"`);
  res.send(buffer);
});

exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  if (!['Waiting', 'Accepted', 'Rejected'].includes(req.body.status)) return next(new AppError('Invalid application status', 400));
  const application = await Application.findOneAndUpdate(
    { _id: req.params.applicationId, career: req.params.id },
    { status: req.body.status },
    { returnDocument: 'after', runValidators: true }
  );
  if (!application) return next(new AppError('Application not found', 404));
  res.json({ message: 'Application status updated successfully.', data: application });
});

exports.deleteApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOneAndDelete({ _id: req.params.applicationId, career: req.params.id });
  if (!application) return next(new AppError('Application not found', 404));
  res.json({ message: 'Application deleted successfully.' });
});
