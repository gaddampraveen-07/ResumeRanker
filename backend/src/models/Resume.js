const mongoose = require('mongoose');

const candidateDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Candidate' },
    email: { type: String, default: 'Not provided' },
    phone: { type: String, default: 'Not provided' },
    skills: { type: [String], default: [] },
    education: { type: [mongoose.Schema.Types.Mixed], default: [] },
    yearsOfExperience: { type: Number, default: null },
    experienceSnippets: { type: [String], default: [] },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    extractedText: {
      type: String,
      default: '',
    },
    candidateDetails: {
      type: candidateDetailsSchema,
      default: () => ({}),
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    processingStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
      index: true,
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.index({ jobId: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
