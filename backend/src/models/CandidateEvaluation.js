const mongoose = require('mongoose');

const candidateEvaluationSchema = new mongoose.Schema(
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
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      default: 'Candidate',
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    rank: {
      type: Number,
      default: 1,
      index: true,
    },
    componentScores: {
      requiredSkills: { type: Number, default: 0 },
      preferredSkills: { type: Number, default: 0 },
      textSimilarity: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      qualification: { type: Number, default: 0 },
    },
    weightsUsed: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    matchingSkills: {
      type: [String],
      default: [],
    },
    missingRequiredSkills: {
      type: [String],
      default: [],
    },
    missingPreferredSkills: {
      type: [String],
      default: [],
    },
    additionalSkills: {
      type: [String],
      default: [],
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recommendation: {
      type: String,
      default: '',
    },
    explanation: {
      type: String,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: ['Awaiting Review', 'Shortlisted', 'Under Review', 'Not Selected'],
      default: 'Awaiting Review',
      index: true,
    },
    recruiterNotes: {
      type: String,
      default: '',
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

candidateEvaluationSchema.index({ jobId: 1, overallScore: -1 });
candidateEvaluationSchema.index({ jobId: 1, ownerId: 1 });

module.exports = mongoose.model('CandidateEvaluation', candidateEvaluationSchema);
