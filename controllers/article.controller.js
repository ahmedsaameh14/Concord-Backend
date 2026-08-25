const mongoose = require('mongoose');
const Article = require('../models/article.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');
const slugify = require('../utils/slugify.util');
const { parsePagination } = require('../utils/project-query.util');
const { ARTICLE_TAGS } = require('../config/news.constants');
const { uploadBuffer } = require('../config/cloudinary-upload');
const { parseBoolean, parseMaybeJson } = require('../utils/form.util');
const {
  sanitizeArticleHtml,
  normalizeSocialLinks,
} = require('../utils/article-content.util');

const LIST_PROJECTION =
  'title slug image description socialLinks tags publishedAt isTopArticle isActive createdAt updatedAt';

const normalizeTags = (raw) => {
  const parsed = parseMaybeJson(raw, raw);
  const list = Array.isArray(parsed)
    ? parsed
    : String(parsed || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return [
    ...new Set(
      list
        .map((tag) => String(tag).toLowerCase().trim())
        .filter((tag) => ARTICLE_TAGS.includes(tag))
    ),
  ];
};

const ensureUniqueSlug = async (baseSlug, excludeId) => {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await Article.findOne({
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

const clearOtherTopArticles = async (keepId) => {
  await Article.updateMany(
    { ...(keepId ? { _id: { $ne: keepId } } : {}), isTopArticle: true },
    { $set: { isTopArticle: false } }
  );
};

const buildArticleFilter = (query = {}, adminView = false) => {
  const filter = {};

  if (!adminView) {
    filter.isActive = true;
  } else if (query.isActive === 'true') {
    filter.isActive = true;
  } else if (query.isActive === 'false') {
    filter.isActive = false;
  }

  if (query.isTopArticle === 'true') filter.isTopArticle = true;
  if (query.isTopArticle === 'false') filter.isTopArticle = false;

  const tags = normalizeTags(query.tags);
  if (tags.length === 1) filter.tags = tags[0];
  else if (tags.length > 1) filter.tags = { $in: tags };

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
  }

  return filter;
};

exports.getArticles = catchAsync(async (req, res) => {
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';
  const filter = buildArticleFilter(req.query, adminView);
  const { page, limit, skip } = parsePagination(req.query);

  const [articles, total, topArticle] = await Promise.all([
    Article.find(filter)
      .select(LIST_PROJECTION)
      .sort({ isTopArticle: -1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Article.countDocuments(filter),
    Article.findOne(adminView ? { isTopArticle: true } : { isTopArticle: true, isActive: true })
      .select(LIST_PROJECTION)
      .lean(),
  ]);

  res.status(200).json({
    message: 'Articles retrieved successfully',
    data: articles,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      topArticle,
      tags: ARTICLE_TAGS,
    },
  });
});

exports.getArticleBySlugOrId = catchAsync(async (req, res, next) => {
  const adminView = Boolean(req.admin) && String(req.query.admin) === 'true';
  const { slugOrId } = req.params;

  let article = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    article = await Article.findById(slugOrId).lean();
  }
  if (!article) {
    article = await Article.findOne({ slug: String(slugOrId).toLowerCase() }).lean();
  }

  if (!article || (!adminView && !article.isActive)) {
    return next(new AppError('Article not found', 404));
  }

  res.status(200).json({
    message: 'Article retrieved successfully',
    data: article,
  });
});

exports.createArticle = catchAsync(async (req, res, next) => {
  const title = String(req.body.title || '').trim();
  const description = sanitizeArticleHtml(req.body.description);
  if (!title || !description) {
    return next(new AppError('Title and description are required', 400));
  }

  const imageFile = req.files?.image?.[0];
  if (!imageFile) {
    return next(new AppError('Article image is required', 400));
  }

  const image = await uploadBuffer(imageFile, 'concord/articles');
  const tags = normalizeTags(req.body.tags);
  const socialLinks = normalizeSocialLinks(req.body.socialLinks);
  const isTopArticle = parseBoolean(req.body.isTopArticle, false);
  const isActive = parseBoolean(req.body.isActive, true);
  const publishedAt = req.body.publishedAt
    ? new Date(req.body.publishedAt)
    : new Date();

  const slug = await ensureUniqueSlug(slugify(title));

  if (isTopArticle) {
    await clearOtherTopArticles();
  }

  const article = await Article.create({
    title,
    slug,
    image,
    description,
    socialLinks,
    tags,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    isTopArticle,
    isActive,
  });

  res.status(201).json({
    message: 'Article created successfully',
    data: article,
  });
});

exports.updateArticle = catchAsync(async (req, res, next) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  if (req.body.title != null) {
    article.title = String(req.body.title).trim();
    article.slug = await ensureUniqueSlug(slugify(article.title), article._id);
  }
  if (req.body.description != null) {
    article.description = sanitizeArticleHtml(req.body.description);
  }
  if (req.body.tags != null) {
    article.tags = normalizeTags(req.body.tags);
  }
  if (req.body.socialLinks != null) {
    article.socialLinks = normalizeSocialLinks(req.body.socialLinks);
  }
  if (req.body.publishedAt != null) {
    const date = new Date(req.body.publishedAt);
    if (!Number.isNaN(date.getTime())) article.publishedAt = date;
  }
  if (req.body.isActive != null) {
    article.isActive = parseBoolean(req.body.isActive, article.isActive);
  }
  if (req.body.isTopArticle != null) {
    article.isTopArticle = parseBoolean(req.body.isTopArticle, article.isTopArticle);
  }

  const imageFile = req.files?.image?.[0];
  if (imageFile) {
    article.image = await uploadBuffer(imageFile, 'concord/articles');
  }

  if (!article.title || !article.description || !article.image) {
    return next(new AppError('Title, description, and image are required', 400));
  }

  if (article.isTopArticle) {
    await clearOtherTopArticles(article._id);
  }

  await article.save();

  res.status(200).json({
    message: 'Article updated successfully',
    data: article,
  });
});

exports.toggleArticleStatus = catchAsync(async (req, res, next) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  if (typeof req.body.isActive === 'boolean') {
    article.isActive = req.body.isActive;
  } else if (req.body.isActive != null) {
    article.isActive = parseBoolean(req.body.isActive, article.isActive);
  } else {
    article.isActive = !article.isActive;
  }

  await article.save();

  res.status(200).json({
    message: `Article ${article.isActive ? 'activated' : 'deactivated'} successfully`,
    data: article,
  });
});

exports.toggleTopArticle = catchAsync(async (req, res, next) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  const nextValue =
    typeof req.body.isTopArticle === 'boolean'
      ? req.body.isTopArticle
      : !article.isTopArticle;

  if (nextValue) {
    await clearOtherTopArticles(article._id);
  }

  article.isTopArticle = nextValue;
  await article.save();

  res.status(200).json({
    message: nextValue ? 'Marked as top article' : 'Removed from top article',
    data: article,
  });
});

exports.deleteArticle = catchAsync(async (req, res, next) => {
  const article = await Article.findByIdAndDelete(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  res.status(200).json({
    message: 'Article deleted successfully',
  });
});
