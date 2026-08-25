const mongoose = require('mongoose');
const { ARTICLE_TAGS } = require('../config/news.constants');
const slugify = require('../utils/slugify.util');

const socialLinksSchema = new mongoose.Schema(
  {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      maxlength: 220,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'Article image is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Article description is required'],
      trim: true,
    },
    socialLinks: {
      type: socialLinksSchema,
      default: () => ({ facebook: '', instagram: '', twitter: '' }),
    },
    tags: {
      type: [
        {
          type: String,
          enum: ARTICLE_TAGS,
          lowercase: true,
          trim: true,
        },
      ],
      default: [],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isTopArticle: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

articleSchema.index({ title: 'text', description: 'text' });

articleSchema.pre('validate', function assignSlug() {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  } else if (this.isModified('slug') && this.slug) {
    this.slug = slugify(this.slug);
  }
});

module.exports = mongoose.model('Article', articleSchema);
