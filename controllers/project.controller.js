const mongoose = require('mongoose');
const Project = require('../models/project.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const slugify = require('../utils/slugify.util');
const {
  buildPublicProjectFilter,
  parsePagination,
  toArrayParam,
} = require('../utils/project-query.util');
const { PROJECT_TYPES } = require('../config/project.constants');
const { uploadBuffer, uploadMany } = require('../config/cloudinary-upload');
const { parseBoolean, parseMaybeJson, parseYear } = require('../utils/form.util');

const LIST_PROJECTION =
  'name slug mainImage overview startYear endYear date address location client contractValue type isActive createdAt updatedAt';

const REQUIRED_FIELDS = [
  'name',
  'overview',
  'startYear',
  'endYear',
  'address',
  'location',
  'client',
  'contractValue',
  'type',
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

  return { sections };
};

const normalizeProjectImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((image) => String(image).trim()).filter(Boolean);
};

const buildProjectFilter = (query = {}, isAdmin = false) => {
  if (!isAdmin) {
    return buildPublicProjectFilter(query);
  }

  const filter = {};

  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  const locations = toArrayParam(query.locations);
  if (locations.length === 1) filter.location = locations[0];
  else if (locations.length > 1) filter.location = { $in: locations };

  const types = toArrayParam(query.types || query.services).filter((type) =>
    PROJECT_TYPES.includes(type)
  );
  if (types.length === 1) filter.type = types[0];
  else if (types.length > 1) filter.type = { $in: types };

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

const formatDuration = (project) => {
  if (!project?.startYear) return '';
  if (!project.endYear || project.endYear === project.startYear) {
    return String(project.startYear);
  }
  return `${project.startYear} – ${project.endYear}`;
};

const withDuration = (project) =>
  project ? { ...project, duration: formatDuration(project) } : project;

const findProjectByParam = async (param) => {
  if (mongoose.Types.ObjectId.isValid(param)) {
    const byId = await Project.findById(param).lean();
    if (byId) return byId;
  }
  return Project.findOne({ slug: String(param).toLowerCase() }).lean();
};

exports.getProjects = catchAsync(async (req, res) => {
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';
  const filter = buildProjectFilter(req.query, adminView);
  const { page, limit, skip } = parsePagination(req.query);

  const [projects, total, locations] = await Promise.all([
    Project.find(filter)
      .select(LIST_PROJECTION)
      .sort({ endYear: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
    Project.distinct('location', adminView ? {} : { isActive: true }),
  ]);

  res.status(200).json({
    message: 'Projects retrieved successfully',
    data: projects.map(withDuration),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      filters: {
        locations: locations.sort(),
        types: PROJECT_TYPES,
        services: PROJECT_TYPES,
      },
    },
  });
});

exports.getProjectBySlugOrId = catchAsync(async (req, res, next) => {
  const project = await findProjectByParam(req.params.slugOrId);
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';

  if (!project || (!adminView && !project.isActive)) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    message: 'Project retrieved successfully',
    data: withDuration(project),
  });
});

exports.getProjectFilters = catchAsync(async (req, res) => {
  const [locationCounts, typeCounts] = await Promise.all([
    Project.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Project.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
  ]);

  const typeCountMap = Object.fromEntries(
    typeCounts.map((item) => [item._id, item.count])
  );

  res.status(200).json({
    message: 'Project filters retrieved successfully',
    data: {
      locations: locationCounts
        .filter((item) => item._id)
        .map((item) => ({
          name: item._id,
          count: item.count,
        })),
      types: PROJECT_TYPES.map((type) => ({
        name: type,
        count: typeCountMap[type] || 0,
      })),
      services: PROJECT_TYPES,
    },
  });
});

exports.createProject = catchAsync(async (req, res, next) => {
  const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
  if (missing.length) {
    return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
  }

  const type = String(req.body.type).toLowerCase();
  if (!PROJECT_TYPES.includes(type)) {
    return next(
      new AppError(`Type must be one of: ${PROJECT_TYPES.join(', ')}`, 400)
    );
  }

  const startYear = parseYear(req.body.startYear);
  const endYear = parseYear(req.body.endYear);
  if (!startYear || !endYear) {
    return next(new AppError('Start year and end year are required', 400));
  }
  if (endYear < startYear) {
    return next(new AppError('End year cannot be before start year', 400));
  }

  const mainImageFile = req.files?.mainImage?.[0];
  if (!mainImageFile && !req.body.mainImage) {
    return next(new AppError('Main image is required', 400));
  }

  const baseSlug = slugify(req.body.name);
  if (!baseSlug) {
    return next(new AppError('Unable to generate a valid project slug', 400));
  }

  const slug = await ensureUniqueSlug(baseSlug);
  const mainImage = mainImageFile
    ? await uploadBuffer(mainImageFile)
    : String(req.body.mainImage).trim();
  const uploadedGallery = await uploadMany(req.files?.ProjectImages || []);
  const existingGallery = normalizeProjectImages(
    parseMaybeJson(req.body.existingProjectImages, req.body.ProjectImages || [])
  );

  const project = await Project.create({
    name: req.body.name,
    slug,
    mainImage,
    overview: req.body.overview,
    startYear,
    endYear,
    address: req.body.address,
    location: String(req.body.location).toLowerCase().trim(),
    client: req.body.client,
    contractValue: req.body.contractValue,
    type,
    ProjectImages: [...existingGallery, ...uploadedGallery],
    keyFeatures: normalizeKeyFeatures(parseMaybeJson(req.body.keyFeatures, { sections: [] })),
    isActive: parseBoolean(req.body.isActive, true),
  });

  res.status(201).json({
    message: 'Project created successfully',
    data: project,
  });
});

exports.updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const updatable = ['name', 'overview', 'address', 'client', 'contractValue'];

  updatable.forEach((field) => {
    if (req.body[field] !== undefined) {
      project[field] = req.body[field];
    }
  });

  if (req.body.isActive !== undefined) {
    project.isActive = parseBoolean(req.body.isActive, project.isActive);
  }

  if (req.body.location !== undefined) {
    project.location = String(req.body.location).toLowerCase().trim();
  }

  if (req.body.startYear !== undefined) {
    const startYear = parseYear(req.body.startYear);
    if (!startYear) {
      return next(new AppError('Start year is invalid', 400));
    }
    project.startYear = startYear;
  }

  if (req.body.endYear !== undefined) {
    const endYear = parseYear(req.body.endYear);
    if (!endYear) {
      return next(new AppError('End year is invalid', 400));
    }
    project.endYear = endYear;
  }

  if (project.endYear < project.startYear) {
    return next(new AppError('End year cannot be before start year', 400));
  }

  if (req.body.type !== undefined) {
    const type = String(req.body.type).toLowerCase();
    if (!PROJECT_TYPES.includes(type)) {
      return next(
        new AppError(`Type must be one of: ${PROJECT_TYPES.join(', ')}`, 400)
      );
    }
    project.type = type;
  }

  const mainImageFile = req.files?.mainImage?.[0];
  if (mainImageFile) {
    project.mainImage = await uploadBuffer(mainImageFile);
  } else if (req.body.mainImage) {
    project.mainImage = String(req.body.mainImage).trim();
  }

  const uploadedGallery = await uploadMany(req.files?.ProjectImages || []);
  if (req.body.existingProjectImages !== undefined || uploadedGallery.length) {
    const existingGallery = normalizeProjectImages(
      parseMaybeJson(req.body.existingProjectImages, project.ProjectImages || [])
    );
    project.ProjectImages = [...existingGallery, ...uploadedGallery];
  }

  if (req.body.keyFeatures !== undefined) {
    project.keyFeatures = normalizeKeyFeatures(
      parseMaybeJson(req.body.keyFeatures, { sections: [] })
    );
  }

  if (req.body.name) {
    const baseSlug = slugify(req.body.name || project.name);
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
