const Project = require('../models/project.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const slugify = require('../utils/slugify.util');
const { parsePagination, toArrayParam } = require('../utils/project-query.util');
const { PROJECT_SERVICES } = require('../Config/project.constants');

const LIST_PROJECTION =
  'name slug image overview date address location client contractValue service isActive createdAt updatedAt';

const REQUIRED_FIELDS = [
  'name',
  'image',
  'overview',
  'date',
  'address',
  'location',
  'client',
  'contractValue',
  'service',
];

const normalizeKeyFeatures = (keyFeatures = {}) => {
  const sections = Array.isArray(keyFeatures.sections)
    ? keyFeatures.sections
        .filter((section) => section && section.title)
        .map((section) => ({
          title: String(section.title).trim(),
          value: section.value != null ? String(section.value).trim() : '',
          items: Array.isArray(section.items)
            ? section.items.map((item) => String(item).trim()).filter(Boolean)
            : undefined,
        }))
    : [];

  return {
    image: keyFeatures.image ? String(keyFeatures.image).trim() : '',
    sections,
  };
};

const buildAdminFilter = (query = {}) => {
  const filter = {};

  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  const locations = toArrayParam(query.locations);
  if (locations.length === 1) filter.location = locations[0];
  else if (locations.length > 1) filter.location = { $in: locations };

  const services = toArrayParam(query.services).filter((service) =>
    PROJECT_SERVICES.includes(service)
  );
  if (services.length === 1) filter.service = services[0];
  else if (services.length > 1) filter.service = { $in: services };

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$text = { $search: search };
    }
  }

  return filter;
};

const ensureUniqueSlug = async (baseSlug, excludeId) => {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await Project.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id')
      .lean();

    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

exports.createProject = catchAsync(async (req, res, next) => {
  const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
  if (missing.length) {
    return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
  }

  const service = String(req.body.service).toLowerCase();
  if (!PROJECT_SERVICES.includes(service)) {
    return next(
      new AppError(`Service must be one of: ${PROJECT_SERVICES.join(', ')}`, 400)
    );
  }

  const baseSlug = slugify(req.body.slug || req.body.name);
  if (!baseSlug) {
    return next(new AppError('Unable to generate a valid project slug', 400));
  }

  const slug = await ensureUniqueSlug(baseSlug);

  const project = await Project.create({
    name: req.body.name,
    slug,
    image: req.body.image,
    overview: req.body.overview,
    date: req.body.date,
    address: req.body.address,
    location: String(req.body.location).toLowerCase().trim(),
    client: req.body.client,
    contractValue: req.body.contractValue,
    service,
    keyFeatures: normalizeKeyFeatures(req.body.keyFeatures),
    isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
  });

  res.status(201).json({
    message: 'Project created successfully',
    data: project,
  });
});

exports.getAdminProjects = catchAsync(async (req, res) => {
  const filter = buildAdminFilter(req.query);
  const { page, limit, skip } = parsePagination(req.query);

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select(LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  res.status(200).json({
    message: 'Admin projects retrieved successfully',
    data: projects,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
});

exports.getAdminProjectById = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id).lean();

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    message: 'Project retrieved successfully',
    data: project,
  });
});

exports.updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const updatable = [
    'name',
    'image',
    'overview',
    'date',
    'address',
    'client',
    'contractValue',
    'isActive',
  ];

  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      project[field] = req.body[field];
    }
  });

  if (req.body.location !== undefined) {
    project.location = String(req.body.location).toLowerCase().trim();
  }

  if (req.body.service !== undefined) {
    const service = String(req.body.service).toLowerCase();
    if (!PROJECT_SERVICES.includes(service)) {
      return next(
        new AppError(`Service must be one of: ${PROJECT_SERVICES.join(', ')}`, 400)
      );
    }
    project.service = service;
  }

  if (req.body.keyFeatures !== undefined) {
    project.keyFeatures = normalizeKeyFeatures(req.body.keyFeatures);
  }

  if (req.body.slug || req.body.name) {
    const baseSlug = slugify(req.body.slug || req.body.name || project.name);
    project.slug = await ensureUniqueSlug(baseSlug, project._id);
  }

  await project.save();

  res.status(200).json({
    message: 'Project updated successfully',
    data: project,
  });
});

exports.toggleProjectStatus = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (typeof req.body.isActive === 'boolean') {
    project.isActive = req.body.isActive;
  } else {
    project.isActive = !project.isActive;
  }

  await project.save();

  res.status(200).json({
    message: `Project is now ${project.isActive ? 'active' : 'inactive'}`,
    data: project,
  });
});

exports.deleteProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  await project.deleteOne();
  res.status(204).send();
});
