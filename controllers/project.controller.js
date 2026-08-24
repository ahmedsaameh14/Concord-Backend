const mongoose = require('mongoose');
const Project = require('../models/project.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const {
  buildPublicProjectFilter,
  parsePagination,
} = require('../utils/project-query.util');
const { PROJECT_SERVICES } = require('../Config/project.constants');

const LIST_PROJECTION =
  'name slug image overview date address location client contractValue service isActive createdAt';

const findProjectByParam = async (param) => {
  if (mongoose.Types.ObjectId.isValid(param)) {
    const byId = await Project.findById(param).lean();
    if (byId) return byId;
  }
  return Project.findOne({ slug: String(param).toLowerCase() }).lean();
};

exports.getProjects = catchAsync(async (req, res) => {
  const filter = buildPublicProjectFilter(req.query);
  const { page, limit, skip } = parsePagination(req.query);

  const [projects, total, locations] = await Promise.all([
    Project.find(filter)
      .select(LIST_PROJECTION)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
    Project.distinct('location', { isActive: true }),
  ]);

  res.status(200).json({
    message: 'Projects retrieved successfully',
    data: projects,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      filters: {
        locations: locations.sort(),
        services: PROJECT_SERVICES,
      },
    },
  });
});

exports.getProjectBySlugOrId = catchAsync(async (req, res, next) => {
  const project = await findProjectByParam(req.params.slugOrId);

  if (!project || !project.isActive) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    message: 'Project retrieved successfully',
    data: project,
  });
});

exports.getProjectFilters = catchAsync(async (req, res) => {
  const locations = await Project.distinct('location', { isActive: true });

  res.status(200).json({
    message: 'Project filters retrieved successfully',
    data: {
      locations: locations.sort(),
      services: PROJECT_SERVICES,
    },
  });
});
