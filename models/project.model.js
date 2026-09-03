const mongoose = require('mongoose');
const { PROJECT_TYPES } = require('../config/project.constants');
const slugify = require('../utils/slugify.util');

const keyFeatureSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [String],
      default: undefined,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
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
    mainImage: {
      type: String,
      required: [true, 'Project image is required'],
      trim: true,
    },
    overview: {
      type: String,
      required: [true, 'Project overview is required'],
      trim: true,
    },
    date: {
      type: Date,
    },
    startYear: {
      type: Number,
      min: 1950,
      max: 2100,
    },
    endYear: {
      type: Number,
      min: 1950,
      max: 2100,
    },
    address: {
      type: String,
      required: [true, 'Project address is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Project location (city) is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    client: {
      type: String,
      required: [true, 'Client is required'],
      trim: true,
    },
    contractValue: {
      type: String,
      required: [true, 'Contract value is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: {
        values: PROJECT_TYPES,
        message: `Type must be one of: ${PROJECT_TYPES.join(', ')}`,
      },
      lowercase: true,
      index: true
    },
    ProjectImages: {
      type: [String],
      trim: true,
      default: [],
    },
    keyFeatures: {
      sections: {
        type: [keyFeatureSectionSchema],
        default: [],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.virtual('duration').get(function duration() {
  if (!this.startYear) return '';
  if (!this.endYear) {
    return `${this.startYear} – now`;
  }
  if (this.endYear === this.startYear) {
    return String(this.startYear);
  }
  return `${this.startYear} – ${this.endYear}`;
});

projectSchema.index({ isActive: 1, location: 1, type: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, type: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, location: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, createdAt: -1 });
projectSchema.index({ name: 'text', client: 'text', address: 'text' });

projectSchema.pre('validate', function setSlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  } else if (this.isModified('slug') && this.slug) {
    this.slug = slugify(this.slug);
  }

  if (this.startYear && this.endYear && this.endYear < this.startYear) {
    this.invalidate('endYear', 'End year cannot be before start year');
  }
});

module.exports = mongoose.model('Project', projectSchema);
