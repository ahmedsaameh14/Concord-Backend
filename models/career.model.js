const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Career title is required'], trim: true, maxlength: 180 },
    experience: { type: String, required: [true, 'Experience is required'], trim: true, maxlength: 40 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 5000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

careerSchema.index({ title: 'text' });
module.exports = mongoose.model('Career', careerSchema);
