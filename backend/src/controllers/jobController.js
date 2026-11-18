const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateEvaluation = require('../models/CandidateEvaluation');
const fs = require('fs');

// @desc    Create a new job description
// @route   POST /api/jobs
// @access  Private
const createJob = async (req, res, next) => {
  try {
    const {
      title,
      company,
      department,
      description,
      requiredSkills,
      preferredSkills,
      qualifications,
      minimumExperience,
      preferredExperience,
      employmentType,
      location,
      status,
      scoringConfiguration,
    } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide job title, company name, and job description.',
      });
    }

    // Clean and split skills if sent as comma-separated string
    const formatSkills = (input) => {
      if (Array.isArray(input)) return input.map((s) => s.trim()).filter(Boolean);
      if (typeof input === 'string') {
        return input.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const job = await Job.create({
      ownerId: req.user._id,
      title,
      company,
      department: department || 'Engineering',
      description,
      requiredSkills: formatSkills(requiredSkills),
      preferredSkills: formatSkills(preferredSkills),
      qualifications: formatSkills(qualifications),
      minimumExperience: Number(minimumExperience) || 0,
      preferredExperience: Number(preferredExperience) || 0,
      employmentType: employmentType || 'Full-time',
      location: location || 'Remote',
      status: status || 'Active',
      shortlistThreshold: req.body.shortlistThreshold !== undefined ? Number(req.body.shortlistThreshold) : 80,
      scoringConfiguration: scoringConfiguration || undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Job description created successfully.',
      job,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all jobs for logged in recruiter with resume counts
// @route   GET /api/jobs
// @access  Private
const getJobs = async (req, res, next) => {
  try {
    const { search, department, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = { ownerId: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { requiredSkills: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (department && department !== 'All') {
      query.department = department;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const jobs = await Job.find(query).sort(sortOptions);

    // Populate resume counts and candidate stats per job
    const jobSummaries = await Promise.all(
      jobs.map(async (job) => {
        const resumeCount = await Resume.countDocuments({ jobId: job._id });
        const evaluatedCount = await CandidateEvaluation.countDocuments({ jobId: job._id });
        const topEvaluation = await CandidateEvaluation.findOne({ jobId: job._id }).sort({ overallScore: -1 });

        return {
          ...job.toObject(),
          resumeCount,
          evaluatedCount,
          topScore: topEvaluation ? topEvaluation.overallScore : null,
        };
      })
    );

    res.json({
      success: true,
      count: jobSummaries.length,
      jobs: jobSummaries,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:jobId
// @access  Private
const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      ownerId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job description not found.',
      });
    }

    const resumeCount = await Resume.countDocuments({ jobId: job._id });
    const evaluatedCount = await CandidateEvaluation.countDocuments({ jobId: job._id });
    const topEvaluation = await CandidateEvaluation.findOne({ jobId: job._id }).sort({ overallScore: -1 });

    res.json({
      success: true,
      job: {
        ...job.toObject(),
        resumeCount,
        evaluatedCount,
        topScore: topEvaluation ? topEvaluation.overallScore : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update job description
// @route   PUT /api/jobs/:jobId
// @access  Private
const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      ownerId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job description not found.',
      });
    }

    const formatSkills = (input) => {
      if (Array.isArray(input)) return input.map((s) => s.trim()).filter(Boolean);
      if (typeof input === 'string') {
        return input.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return undefined;
    };

    const updates = { ...req.body };
    if (updates.requiredSkills) updates.requiredSkills = formatSkills(updates.requiredSkills);
    if (updates.preferredSkills) updates.preferredSkills = formatSkills(updates.preferredSkills);
    if (updates.qualifications) updates.qualifications = formatSkills(updates.qualifications);

    Object.assign(job, updates);
    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully.',
      job,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete job and associated resumes and evaluations
// @route   DELETE /api/jobs/:jobId
// @access  Private
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      ownerId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job description not found.',
      });
    }

    // Find and delete physical resume files
    const resumes = await Resume.find({ jobId: job._id });
    for (const r of resumes) {
      if (r.filePath && fs.existsSync(r.filePath)) {
        try {
          fs.unlinkSync(r.filePath);
        } catch (e) {
          console.warn(`Could not delete file ${r.filePath}:`, e.message);
        }
      }
    }

    // Cascade delete resumes and evaluations
    await Resume.deleteMany({ jobId: job._id });
    await CandidateEvaluation.deleteMany({ jobId: job._id });
    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job and associated resumes deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
};
