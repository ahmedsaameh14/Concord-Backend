const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  universityName: { type: String, required: true, trim: true, maxlength: 160 },
  degree: { type: String, required: true, trim: true, maxlength: 160 },
  graduationDate: { type: Date, required: true },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true, maxlength: 160 },
}, { _id: false });

const workExperienceSchema = new mongoose.Schema({
  jobTitle: { type: String, required: true, trim: true, maxlength: 160 },
  placeOfWork: { type: String, required: true, trim: true, maxlength: 160 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  currentlyWorking: { type: Boolean, default: false },
  salary: { type: String, required: true, trim: true, maxlength: 80 },
}, { _id: false });

const applicationSchema = new mongoose.Schema(
  {
    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true, index: true },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 160 },
    dateOfBirth: { type: Date, required: [true, 'Date of birth is required'] },
    applicationDate: { type: Date, default: Date.now, index: true },
    gender: { type: String, required: [true, 'Gender is required'], enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, maxlength: 160, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'] },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true, maxlength: 40 },
    alternatePhone: { type: String, trim: true, maxlength: 40 },
    positionAppliedFor: { type: String, required: true, trim: true, maxlength: 160 },
    resumeUrl: { type: String, required: [true, 'Resume is required'], trim: true, maxlength: 500 },
    address: { type: String, required: [true, 'Address is required'], trim: true, maxlength: 300 },
    country: { type: String, required: [true, 'Country is required'], trim: true, maxlength: 100 },
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 100 },
    educationalQualifications: { type: [educationSchema], required: true, validate: [(items) => items.length > 0, 'At least one educational qualification is required'] },
    courses: { type: [courseSchema], default: [] },
    workExperience: { type: [workExperienceSchema], default: [] },
    expectedSalary: { type: String, required: [true, 'Expected salary is required'], trim: true, maxlength: 100 },
    agreedToDataStorage: { type: Boolean, required: true, validate: { validator: Boolean, message: 'You must agree to data storage' } },
    status: { type: String, enum: ['Waiting', 'Accepted', 'Rejected'], default: 'Waiting', index: true },
  },
  { timestamps: true }
);

applicationSchema.index({ career: 1, createdAt: -1 });
module.exports = mongoose.model('Application', applicationSchema);
