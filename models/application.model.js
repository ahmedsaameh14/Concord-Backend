const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true, index: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 80 },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 80 },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, maxlength: 160, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'] },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 40 },
    coverLetter: { type: String, required: [true, 'Cover letter is required'], trim: true, maxlength: 5000 },
    cvLink: { type: String, required: [true, 'CV link is required'], trim: true, maxlength: 500, match: [/^https?:\/\/\S+$/i, 'Please provide a valid CV link'] },
    agreedToDataStorage: { type: Boolean, required: true, validate: { validator: Boolean, message: 'You must agree to data storage' } },
    status: { type: String, enum: ['Waiting', 'Accepted', 'Rejected'], default: 'Waiting', index: true },
  },
  { timestamps: true }
);

applicationSchema.index({ career: 1, createdAt: -1 });
module.exports = mongoose.model('Application', applicationSchema);
