const mongoose = require('mongoose');
const { PROJECT_SERVICES } = require('../Config/project.constants');
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
    image: {
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
      required: [true, 'Project date is required'],
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
    service: {
      type: String,
      required: [true, 'Service is required'],
      enum: {
        values: PROJECT_SERVICES,
        message: `Service must be one of: ${PROJECT_SERVICES.join(', ')}`,
      },
      lowercase: true,
      index: true,
    },
    keyFeatures: {
      image: {
        type: String,
        trim: true,
        default: '',
      },
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
  }
);

projectSchema.index({ isActive: 1, location: 1, service: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, service: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, location: 1, createdAt: -1 });
projectSchema.index({ isActive: 1, createdAt: -1 });
projectSchema.index({ name: 'text', client: 'text', address: 'text' });

projectSchema.pre('validate', function setSlug(next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  } else if (this.isModified('slug') && this.slug) {
    this.slug = slugify(this.slug);
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
