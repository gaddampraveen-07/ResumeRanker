const mongoose = require('mongoose');

const scoringConfigSchema = new mongoose.Schema(
  {
    weights: {
      requiredSkills: { type: Number, default: 40 },
      preferredSkills: { type: Number, default: 20 },
      textSimilarity: { type: Number, default: 25 },
      experience: { type: Number, default: 10 },
      qualification: { type: Number, default: 5 },
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [120, 'Job title cannot exceed 120 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'Engineering',
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    qualifications: {
      type: [String],
      default: [],
    },
    minimumExperience: {
      type: Number,
      default: 0,
      min: [0, 'Minimum experience cannot be negative'],
    },
    preferredExperience: {
      type: Number,
      default: 0,
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'],
      default: 'Full-time',
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    status: {
      type: String,
      enum: ['Active', 'Draft', 'Archived', 'Closed'],
      default: 'Active',
      index: true,
    },
    shortlistThreshold: {
      type: Number,
      default: 80,
      min: [0, 'Threshold cannot be less than 0%'],
      max: [100, 'Threshold cannot exceed 100%'],
    },
    scoringConfiguration: {
      type: scoringConfigSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
