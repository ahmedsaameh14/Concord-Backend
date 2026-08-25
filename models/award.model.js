const mongoose = require('mongoose');
const slugify = require('../utils/slugify.util');

const awardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Award title is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      required: [true, 'Award subtitle is required'],
      trim: true,
      maxlength: 400,
    },
    image: {
      type: String,
      required: [true, 'Award image is required'],
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

awardSchema.pre('validate', function assignSlug() {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  } else if (this.isModified('slug') && this.slug) {
    this.slug = slugify(this.slug);
  }
});

module.exports = mongoose.model('Award', awardSchema);
