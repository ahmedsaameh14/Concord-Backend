const mongoose = require('mongoose');
const Award = require('../models/award.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const slugify = require('../utils/slugify.util');
const { parsePagination } = require('../utils/project-query.util');
const { uploadBuffer } = require('../config/cloudinary-upload');
const { parseBoolean } = require('../utils/form.util');

const LIST_PROJECTION =
  'title slug subtitle image sortOrder isActive createdAt updatedAt';

const ensureUniqueSlug = async (baseSlug, excludeId) => {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await Award.findOne({
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

const buildAwardFilter = (query = {}, adminView = false) => {
  const filter = {};

  if (!adminView) {
    filter.isActive = true;
  } else if (query.isActive === 'true') {
    filter.isActive = true;
  } else if (query.isActive === 'false') {
    filter.isActive = false;
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }
  }

  return filter;
};

exports.getAwards = catchAsync(async (req, res) => {
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';
  const filter = buildAwardFilter(req.query, adminView);
  const { page, limit, skip } = parsePagination(req.query);

  const [awards, total] = await Promise.all([
    Award.find(filter)
      .select(LIST_PROJECTION)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Award.countDocuments(filter),
  ]);

  res.status(200).json({
    message: 'Awards retrieved successfully',
    data: awards,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
});

exports.getAwardBySlugOrId = catchAsync(async (req, res, next) => {
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';
  const { slugOrId } = req.params;

  let award = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    award = await Award.findById(slugOrId).lean();
  }
  if (!award) {
    award = await Award.findOne({ slug: String(slugOrId).toLowerCase() }).lean();
  }

  if (!award || (!adminView && !award.isActive)) {
    return next(new AppError('Award not found', 404));
  }

  res.status(200).json({
    message: 'Award retrieved successfully',
    data: award,
  });
});

exports.createAward = catchAsync(async (req, res, next) => {
  const title = String(req.body.title || '').trim();
  const subtitle = String(req.body.subtitle || '').trim();
  if (!title || !subtitle) {
    return next(new AppError('Title and subtitle are required', 400));
  }

  const imageFile = req.files?.image?.[0];
  if (!imageFile) {
    return next(new AppError('Award image is required', 400));
  }

  const image = await uploadBuffer(imageFile, 'concord/awards');
  const sortOrder = Number.parseInt(req.body.sortOrder, 10);
  const isActive = parseBoolean(req.body.isActive, true);
  const slug = await ensureUniqueSlug(slugify(title));

  const award = await Award.create({
    title,
    slug,
    subtitle,
    image,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    isActive,
  });

  res.status(201).json({
    message: 'Award created successfully',
    data: award,
  });
});

exports.updateAward = catchAsync(async (req, res, next) => {
  const award = await Award.findById(req.params.id);
  if (!award) {
    return next(new AppError('Award not found', 404));
  }

  if (req.body.title != null) {
    award.title = String(req.body.title).trim();
    award.slug = await ensureUniqueSlug(slugify(award.title), award._id);
  }
  if (req.body.subtitle != null) {
    award.subtitle = String(req.body.subtitle).trim();
  }
  if (req.body.sortOrder != null) {
    const sortOrder = Number.parseInt(req.body.sortOrder, 10);
    if (Number.isInteger(sortOrder)) award.sortOrder = sortOrder;
  }
  if (req.body.isActive != null) {
    award.isActive = parseBoolean(req.body.isActive, award.isActive);
  }

  const imageFile = req.files?.image?.[0];
  if (imageFile) {
    award.image = await uploadBuffer(imageFile, 'concord/awards');
  }

  if (!award.title || !award.subtitle || !award.image) {
    return next(new AppError('Title, subtitle, and image are required', 400));
  }

  await award.save();

  res.status(200).json({
    message: 'Award updated successfully',
    data: award,
  });
});

exports.toggleAwardStatus = catchAsync(async (req, res, next) => {
  const award = await Award.findById(req.params.id);
  if (!award) {
    return next(new AppError('Award not found', 404));
  }

  if (typeof req.body.isActive === 'boolean') {
    award.isActive = req.body.isActive;
  } else if (req.body.isActive != null) {
    award.isActive = parseBoolean(req.body.isActive, award.isActive);
  } else {
    award.isActive = !award.isActive;
  }

  await award.save();

  res.status(200).json({
    message: `Award ${award.isActive ? 'activated' : 'deactivated'} successfully`,
    data: award,
  });
});

exports.deleteAward = catchAsync(async (req, res, next) => {
  const award = await Award.findByIdAndDelete(req.params.id);
  if (!award) {
    return next(new AppError('Award not found', 404));
  }

  res.status(200).json({
    message: 'Award deleted successfully',
  });
});
