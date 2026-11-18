const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateEvaluation = require('../models/CandidateEvaluation');
const { extractTextFromFile, matchResume } = require('../services/aiServiceClient');

// @desc    Upload multiple candidate resumes for a job
// @route   POST /api/jobs/:jobId/resumes
// @access  Private
const uploadResumes = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Verify job belongs to recruiter
    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Target job description not found.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No resume files uploaded. Please select at least one PDF or DOCX file.',
      });
    }

    const uploadResults = [];

    for (const file of req.files) {
      // If a resume with the same name already exists for this job, replace it so recruiter can re-upload/update
      const existing = await Resume.findOne({
        jobId: job._id,
        originalFileName: file.originalname,
      });

      if (existing) {
        try {
          if (existing.filePath && fs.existsSync(existing.filePath)) {
            fs.unlinkSync(existing.filePath);
          }
        } catch (e) {}
        await CandidateEvaluation.deleteOne({ resumeId: existing._id });
        await existing.deleteOne();
      }

      // Create pending resume record
      const resume = await Resume.create({
        ownerId: req.user._id,
        jobId: job._id,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        processingStatus: 'Processing',
      });

      // Extract text and parse candidate details via AI service
      try {
        const parsed = await extractTextFromFile(file.path, file.originalname);

        resume.extractedText = parsed.extractedText || '';
        resume.candidateDetails = {
          name: parsed.name || 'Candidate',
          email: parsed.email || 'Not provided',
          phone: parsed.phone || 'Not provided',
          skills: parsed.skills || [],
          education: parsed.education || [],
          yearsOfExperience: parsed.yearsOfExperience || null,
          experienceSnippets: parsed.experienceSnippets || [],
          evidence: parsed.evidence || {},
        };
        resume.extractedSkills = parsed.skills || [];
        resume.processingStatus = 'Completed';
        await resume.save();

        // Also evaluate match against the current job
        try {
          const evalResult = await matchResume(
            {
              extractedText: resume.extractedText,
              skills: resume.candidateDetails.skills,
              yearsOfExperience: resume.candidateDetails.yearsOfExperience,
              education: resume.candidateDetails.education,
              name: resume.candidateDetails.name,
              evidence: resume.candidateDetails.evidence,
            },
            {
              title: job.title,
              description: job.description,
              requiredSkills: job.requiredSkills,
              preferredSkills: job.preferredSkills,
              minimumExperience: job.minimumExperience,
              qualifications: job.qualifications,
              shortlistThreshold: job.shortlistThreshold ?? 80,
            },
            job.scoringConfiguration?.weights
          );

          const threshold = job.shortlistThreshold ?? 80;
          const isEligible = evalResult.overallScore >= threshold;
          const initialStatus = isEligible ? 'Shortlisted' : 'Awaiting Review';
          const initialNotes = isEligible
            ? `Auto-shortlisted: candidate match score (${evalResult.overallScore}%) meets or exceeds the ${threshold}% shortlist threshold.`
            : '';

          await CandidateEvaluation.findOneAndUpdate(
            { jobId: job._id, resumeId: resume._id },
            {
              ownerId: req.user._id,
              jobId: job._id,
              resumeId: resume._id,
              candidateName: resume.candidateDetails.name,
              overallScore: evalResult.overallScore,
              componentScores: evalResult.componentScores,
              weightsUsed: evalResult.weights,
              matchingSkills: evalResult.matchingSkills,
              missingRequiredSkills: evalResult.missingRequiredSkills,
              missingPreferredSkills: evalResult.missingPreferredSkills,
              additionalSkills: evalResult.additionalSkills,
              evidence: evalResult.evidence,
              recommendation: evalResult.recommendation,
              explanation: evalResult.explanation,
              reviewStatus: initialStatus,
              recruiterNotes: initialNotes,
              evaluatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (evalErr) {
          console.warn(`Evaluation warning for ${file.originalname}:`, evalErr.message);
        }

        uploadResults.push({
          id: resume._id,
          originalFileName: file.originalname,
          candidateName: resume.candidateDetails.name,
          skillsCount: resume.candidateDetails.skills.length,
          status: 'Completed',
        });
      } catch (procErr) {
        resume.processingStatus = 'Failed';
        resume.processingError = procErr.message || 'Failed to parse resume text';
        await resume.save();

        uploadResults.push({
          id: resume._id,
          originalFileName: file.originalname,
          status: 'Failed',
          error: procErr.message,
        });
      }
    }

    // Update ranks across all candidates for this job
    await recalculateJobRanks(job._id);

    // Attach evaluation details to completed upload results
    for (const item of uploadResults) {
      if (item.status === 'Completed' && item.id) {
        const ev = await CandidateEvaluation.findOne({ resumeId: item.id, jobId: job._id });
        if (ev) {
          item.candidateEvaluationId = ev._id;
          item.rank = ev.rank;
          item.overallScore = ev.overallScore;
          item.reviewStatus = ev.reviewStatus;
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Processed ${uploadResults.length} resume(s).`,
      results: uploadResults,
    });
  } catch (err) {
    next(err);
  }
};

// Helper: re-orders ranks from highest to lowest overallScore
const recalculateJobRanks = async (jobId) => {
  const evaluations = await CandidateEvaluation.find({ jobId }).sort({ overallScore: -1 });
  for (let i = 0; i < evaluations.length; i++) {
    evaluations[i].rank = i + 1;
    await evaluations[i].save();
  }
};

// @desc    Get all resumes for a job
// @route   GET /api/jobs/:jobId/resumes
// @access  Private
const getResumesByJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const resumes = await Resume.find({ jobId, ownerId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resumes.length,
      resumes,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single resume
// @route   GET /api/resumes/:resumeId
// @access  Private
const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      ownerId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    res.json({
      success: true,
      resume,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Download or view original resume file
// @route   GET /api/resumes/:resumeId/download
// @access  Private
const downloadResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      ownerId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume file record not found' });
    }

    if (!fs.existsSync(resume.filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file not found on disk' });
    }

    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(resume.originalFileName)}"`
    );
    const fileStream = fs.createReadStream(resume.filePath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete single resume
// @route   DELETE /api/resumes/:resumeId
// @access  Private
const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      ownerId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (fs.existsSync(resume.filePath)) {
      try {
        fs.unlinkSync(resume.filePath);
      } catch (e) {}
    }

    const jobId = resume.jobId;
    await CandidateEvaluation.deleteOne({ resumeId: resume._id });
    await resume.deleteOne();

    await recalculateJobRanks(jobId);

    res.json({
      success: true,
      message: 'Resume and associated evaluation deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reprocess a resume (re-extract and re-evaluate)
// @route   POST /api/resumes/:resumeId/reprocess
// @access  Private
const reprocessResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      ownerId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const job = await Job.findById(resume.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Associated job not found' });
    }

    if (!fs.existsSync(resume.filePath)) {
      return res.status(400).json({ success: false, message: 'Resume file not found on disk' });
    }

    const parsed = await extractTextFromFile(resume.filePath, resume.originalFileName);
    resume.extractedText = parsed.extractedText || '';
    resume.candidateDetails = {
      name: parsed.name || 'Candidate',
      email: parsed.email || 'Not provided',
      phone: parsed.phone || 'Not provided',
      skills: parsed.skills || [],
      education: parsed.education || [],
      yearsOfExperience: parsed.yearsOfExperience || null,
      experienceSnippets: parsed.experienceSnippets || [],
      evidence: parsed.evidence || {},
    };
    resume.extractedSkills = parsed.skills || [];
    resume.processingStatus = 'Completed';
    resume.processingError = undefined;
    await resume.save();

    const evalResult = await matchResume(
      {
        extractedText: resume.extractedText,
        skills: resume.candidateDetails.skills,
        yearsOfExperience: resume.candidateDetails.yearsOfExperience,
        education: resume.candidateDetails.education,
        name: resume.candidateDetails.name,
        evidence: resume.candidateDetails.evidence,
      },
      {
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minimumExperience: job.minimumExperience,
        qualifications: job.qualifications,
        shortlistThreshold: job.shortlistThreshold ?? 80,
      },
      job.scoringConfiguration?.weights
    );

    const threshold = job.shortlistThreshold ?? 80;
    const isEligible = evalResult.overallScore >= threshold;

    const evaluation = await CandidateEvaluation.findOneAndUpdate(
      { jobId: job._id, resumeId: resume._id },
      {
        ownerId: req.user._id,
        jobId: job._id,
        resumeId: resume._id,
        candidateName: resume.candidateDetails.name,
        overallScore: evalResult.overallScore,
        componentScores: evalResult.componentScores,
        weightsUsed: evalResult.weights,
        matchingSkills: evalResult.matchingSkills,
        missingRequiredSkills: evalResult.missingRequiredSkills,
        missingPreferredSkills: evalResult.missingPreferredSkills,
        additionalSkills: evalResult.additionalSkills,
        evidence: evalResult.evidence,
        recommendation: evalResult.recommendation,
        explanation: evalResult.explanation,
        reviewStatus: isEligible ? 'Shortlisted' : 'Awaiting Review',
        recruiterNotes: isEligible ? `Auto-shortlisted (Score ${evalResult.overallScore}% ≥ ${threshold}% threshold).` : '',
        evaluatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await recalculateJobRanks(job._id);

    res.json({
      success: true,
      message: `Resume for ${resume.candidateDetails.name} parsed and evaluated successfully.`,
      resume,
      evaluation,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Quick-load sample candidate resumes directly into a job
// @route   POST /api/jobs/:jobId/load-sample-resumes
// @access  Private
const loadSampleResumes = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const sampleDir = path.join(__dirname, '../../../sample_resumes');
    const uploadsDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(sampleDir)) {
      return res.status(404).json({ success: false, message: 'Sample resumes folder not found.' });
    }

    const files = fs.readdirSync(sampleDir);
    const loadedResults = [];

    for (const f of files) {
      if (!f.endsWith('.docx') && !f.endsWith('.pdf')) continue;
      const srcPath = path.join(sampleDir, f);
      const destFilename = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${f}`;
      const destPath = path.join(uploadsDir, destFilename);

      fs.copyFileSync(srcPath, destPath);
      const stats = fs.statSync(destPath);

      // Remove existing resume with same name if any
      const existing = await Resume.findOne({ jobId: job._id, originalFileName: f });
      if (existing) {
        await CandidateEvaluation.deleteOne({ resumeId: existing._id });
        await existing.deleteOne();
      }

      const parsed = await extractTextFromFile(destPath, f);

      const resume = await Resume.create({
        ownerId: req.user._id,
        jobId: job._id,
        originalFileName: f,
        storedFileName: destFilename,
        filePath: destPath,
        fileSize: stats.size,
        mimeType: f.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        processingStatus: 'Completed',
        extractedText: parsed.extractedText || '',
        candidateDetails: {
          name: parsed.name || f.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          email: parsed.email || 'Not provided',
          phone: parsed.phone || 'Not provided',
          skills: parsed.skills || [],
          education: parsed.education || [],
          yearsOfExperience: parsed.yearsOfExperience || null,
          experienceSnippets: parsed.experienceSnippets || [],
          evidence: parsed.evidence || {},
        },
        extractedSkills: parsed.skills || [],
      });

      const evalResult = await matchResume(
        {
          extractedText: resume.extractedText,
          skills: resume.candidateDetails.skills,
          yearsOfExperience: resume.candidateDetails.yearsOfExperience,
          education: resume.candidateDetails.education,
          name: resume.candidateDetails.name,
          evidence: resume.candidateDetails.evidence,
        },
        {
          title: job.title,
          description: job.description,
          requiredSkills: job.requiredSkills,
          preferredSkills: job.preferredSkills,
          minimumExperience: job.minimumExperience,
          qualifications: job.qualifications,
          shortlistThreshold: job.shortlistThreshold ?? 80,
        },
        job.scoringConfiguration?.weights
      );

      const threshold = job.shortlistThreshold ?? 80;
      const isEligible = evalResult.overallScore >= threshold;

      const ev = await CandidateEvaluation.create({
        ownerId: req.user._id,
        jobId: job._id,
        resumeId: resume._id,
        candidateName: resume.candidateDetails.name,
        overallScore: evalResult.overallScore,
        componentScores: evalResult.componentScores,
        weightsUsed: evalResult.weights,
        matchingSkills: evalResult.matchingSkills,
        missingRequiredSkills: evalResult.missingRequiredSkills,
        missingPreferredSkills: evalResult.missingPreferredSkills,
        additionalSkills: evalResult.additionalSkills,
        evidence: evalResult.evidence,
        recommendation: evalResult.recommendation,
        explanation: evalResult.explanation,
        reviewStatus: isEligible ? 'Shortlisted' : 'Awaiting Review',
        recruiterNotes: isEligible
          ? `Auto-shortlisted: candidate match score (${evalResult.overallScore}%) meets or exceeds the ${threshold}% recruiter shortlist threshold.`
          : `Candidate match score (${evalResult.overallScore}%) is below the ${threshold}% shortlist threshold.`,
        evaluatedAt: new Date(),
      });

      loadedResults.push({
        id: resume._id,
        candidateEvaluationId: ev._id,
        candidateName: resume.candidateDetails.name,
        originalFileName: f,
        overallScore: evalResult.overallScore,
        reviewStatus: ev.reviewStatus,
        status: 'Completed',
      });
    }

    await recalculateJobRanks(job._id);

    // Attach computed ranks to loadedResults
    for (const item of loadedResults) {
      if (item.candidateEvaluationId) {
        const ev = await CandidateEvaluation.findById(item.candidateEvaluationId);
        if (ev) {
          item.rank = ev.rank;
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully loaded and evaluated ${loadedResults.length} sample candidate resume(s).`,
      results: loadedResults,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadResumes,
  getResumesByJob,
  getResumeById,
  downloadResume,
  deleteResume,
  recalculateJobRanks,
  reprocessResume,
  loadSampleResumes,
};
