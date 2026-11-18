const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateEvaluation = require('../models/CandidateEvaluation');
const { rankCandidates, matchResume } = require('../services/aiServiceClient');

// @desc    Trigger or re-calculate ranking for all resumes of a job
// @route   POST /api/jobs/:jobId/rank
// @access  Private
const triggerRanking = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { customWeights } = req.body;

    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const fs = require('fs');
    const { extractTextFromFile } = require('../services/aiServiceClient');

    // Automatically recover and re-process any failed or unprocessed resumes for this job
    const allJobResumes = await Resume.find({
      jobId: job._id,
      ownerId: req.user._id,
    });

    for (const r of allJobResumes) {
      if (r.processingStatus !== 'Completed') {
        try {
          if (r.filePath && fs.existsSync(r.filePath)) {
            const parsed = await extractTextFromFile(r.filePath, r.originalFileName);
            r.extractedText = parsed.extractedText || '';
            r.candidateDetails = {
              name: parsed.name || 'Candidate',
              email: parsed.email || 'Not provided',
              phone: parsed.phone || 'Not provided',
              skills: parsed.skills || [],
              education: parsed.education || [],
              yearsOfExperience: parsed.yearsOfExperience || null,
              experienceSnippets: parsed.experienceSnippets || [],
              evidence: parsed.evidence || {},
            };
            r.extractedSkills = parsed.skills || [];
            r.processingStatus = 'Completed';
            r.processingError = undefined;
            await r.save();
          }
        } catch (recoverErr) {
          console.warn(`[Ranking Auto-Recovery] Error re-processing ${r.originalFileName}:`, recoverErr.message);
        }
      }
    }

    const resumes = await Resume.find({
      jobId: job._id,
      ownerId: req.user._id,
      processingStatus: 'Completed',
    });

    if (resumes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No resumes found for this job. Please upload candidate resumes or load sample data.',
      });
    }

    // Format candidate payload for AI batch ranking
    const candidatePayload = resumes.map((r) => ({
      resumeId: r._id.toString(),
      originalFileName: r.originalFileName,
      name: r.candidateDetails.name || 'Candidate',
      extractedText: r.extractedText || '',
      skills: r.candidateDetails.skills || [],
      yearsOfExperience: r.candidateDetails.yearsOfExperience,
      education: r.candidateDetails.education || [],
      evidence: r.candidateDetails.evidence || {},
    }));

    const weightsToUse = customWeights || job.scoringConfiguration?.weights;

    const rankResponse = await rankCandidates(
      candidatePayload,
      {
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minimumExperience: job.minimumExperience,
        qualifications: job.qualifications,
      },
      weightsToUse
    );

    // Save or update evaluations in MongoDB
    const updatedEvaluations = [];
    const threshold = job.shortlistThreshold ?? 80;

    for (const item of rankResponse.rankedCandidates) {
      const existing = await CandidateEvaluation.findOne({ jobId: job._id, resumeId: item.resumeId });
      let currentStatus = existing?.reviewStatus || 'Awaiting Review';

      // Enforce rule: candidates can only be shortlisted if score >= threshold
      if (item.overallScore < threshold && currentStatus === 'Shortlisted') {
        currentStatus = 'Awaiting Review';
      } else if (item.overallScore >= threshold && currentStatus === 'Awaiting Review') {
        currentStatus = 'Shortlisted';
      }

      const evaluation = await CandidateEvaluation.findOneAndUpdate(
        { jobId: job._id, resumeId: item.resumeId },
        {
          ownerId: req.user._id,
          jobId: job._id,
          resumeId: item.resumeId,
          candidateName: item.candidateName || item.candidate?.name || 'Candidate',
          overallScore: item.overallScore,
          rank: item.rank,
          componentScores: item.componentScores,
          weightsUsed: item.weights,
          matchingSkills: item.matchingSkills,
          missingRequiredSkills: item.missingRequiredSkills,
          missingPreferredSkills: item.missingPreferredSkills,
          additionalSkills: item.additionalSkills,
          evidence: item.evidence,
          recommendation: item.recommendation,
          explanation: item.explanation,
          reviewStatus: currentStatus,
          evaluatedAt: new Date(),
        },
        { upsert: true, new: true }
      ).populate('resumeId', 'originalFileName fileSize createdAt candidateDetails');

      updatedEvaluations.push(evaluation);
    }

    res.json({
      success: true,
      message: `Successfully calculated rankings for ${updatedEvaluations.length} candidate(s).`,
      totalCandidates: updatedEvaluations.length,
      rankings: updatedEvaluations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get ranked candidates for a job with search, filters, and sort
// @route   GET /api/jobs/:jobId/rankings
// @access  Private
const getRankingsByJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const {
      search,
      reviewStatus,
      minScore,
      maxScore,
      skill,
      sortBy = 'rank',
      order = 'asc',
    } = req.query;

    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const query = { jobId: job._id, ownerId: req.user._id };

    if (reviewStatus && reviewStatus !== 'All') {
      query.reviewStatus = reviewStatus;
    }

    if ((minScore !== undefined && minScore !== '') || (maxScore !== undefined && maxScore !== '')) {
      query.overallScore = {};
      if (minScore !== undefined && minScore !== '') query.overallScore.$gte = Number(minScore);
      if (maxScore !== undefined && maxScore !== '') query.overallScore.$lte = Number(maxScore);
    }

    if (skill && skill.trim()) {
      query.matchingSkills = { $in: [new RegExp(skill.trim(), 'i')] };
    }

    if (search && search.trim()) {
      query.$or = [
        { candidateName: { $regex: search.trim(), $options: 'i' } },
        { matchingSkills: { $in: [new RegExp(search.trim(), 'i')] } },
      ];
    }

    const sortOptions = {};
    if (sortBy === 'score' || sortBy === 'overallScore') {
      sortOptions.overallScore = order === 'asc' ? 1 : -1;
    } else if (sortBy === 'name' || sortBy === 'candidateName') {
      sortOptions.candidateName = order === 'asc' ? 1 : -1;
    } else {
      sortOptions.rank = order === 'desc' ? -1 : 1;
    }

    const evaluations = await CandidateEvaluation.find(query)
      .populate('resumeId', 'originalFileName fileSize candidateDetails processingStatus')
      .sort(sortOptions);

    res.json({
      success: true,
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minimumExperience: job.minimumExperience,
        qualifications: job.qualifications,
        shortlistThreshold: job.shortlistThreshold ?? 80,
      },
      count: evaluations.length,
      rankings: evaluations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed candidate analysis & profile
// @route   GET /api/jobs/:jobId/candidates/:candidateId/analysis
// @access  Private
const getCandidateAnalysis = async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;

    const evaluation = await CandidateEvaluation.findOne({
      _id: candidateId,
      jobId,
      ownerId: req.user._id,
    }).populate('resumeId');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Candidate evaluation record not found.',
      });
    }

    const job = await Job.findById(jobId);

    res.json({
      success: true,
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        qualifications: job.qualifications,
        minimumExperience: job.minimumExperience,
        shortlistThreshold: job.shortlistThreshold ?? 80,
      },
      candidate: {
        id: evaluation._id,
        resumeId: evaluation.resumeId?._id,
        originalFileName: evaluation.resumeId?.originalFileName,
        name: evaluation.candidateName,
        email: evaluation.resumeId?.candidateDetails?.email || 'Not provided',
        phone: evaluation.resumeId?.candidateDetails?.phone || 'Not provided',
        yearsOfExperience: evaluation.resumeId?.candidateDetails?.yearsOfExperience,
        education: evaluation.resumeId?.candidateDetails?.education || [],
        experienceSnippets: evaluation.resumeId?.candidateDetails?.experienceSnippets || [],
        allExtractedSkills: evaluation.resumeId?.candidateDetails?.skills || [],
        overallScore: evaluation.overallScore,
        rank: evaluation.rank,
        componentScores: evaluation.componentScores,
        weightsUsed: evaluation.weightsUsed,
        matchingSkills: evaluation.matchingSkills,
        missingRequiredSkills: evaluation.missingRequiredSkills,
        missingPreferredSkills: evaluation.missingPreferredSkills,
        additionalSkills: evaluation.additionalSkills,
        evidence: evaluation.evidence || evaluation.resumeId?.candidateDetails?.evidence || {},
        recommendation: evaluation.recommendation,
        explanation: evaluation.explanation,
        reviewStatus: evaluation.reviewStatus,
        recruiterNotes: evaluation.recruiterNotes,
        evaluatedAt: evaluation.evaluatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Compare multiple candidates side-by-side
// @route   POST /api/jobs/:jobId/candidates/compare
// @access  Private
const compareCandidates = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { candidateIds } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 candidate IDs for comparison.',
      });
    }

    const candidates = await CandidateEvaluation.find({
      _id: { $in: candidateIds },
      jobId,
      ownerId: req.user._id,
    }).populate('resumeId');

    if (candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching candidates found' });
    }

    // Find overlapping and unique skills among compared candidates
    const allMatching = candidates.map((c) => new Set(c.matchingSkills));
    const commonSkills = [...allMatching[0]].filter((s) =>
      allMatching.every((set) => set.has(s))
    );

    res.json({
      success: true,
      comparison: {
        commonSkills,
        candidates: candidates.map((c) => ({
          id: c._id,
          name: c.candidateName,
          rank: c.rank,
          overallScore: c.overallScore,
          componentScores: c.componentScores,
          matchingSkills: c.matchingSkills,
          missingRequiredSkills: c.missingRequiredSkills,
          additionalSkills: c.additionalSkills,
          yearsOfExperience: c.resumeId?.candidateDetails?.yearsOfExperience,
          reviewStatus: c.reviewStatus,
          recommendation: c.recommendation,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update candidate review status
// @route   PATCH /api/candidates/:candidateId/review
// @access  Private
const updateCandidateReview = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { reviewStatus } = req.body;

    const allowed = ['Awaiting Review', 'Shortlisted', 'Under Review', 'Not Selected'];
    if (!allowed.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const candidate = await CandidateEvaluation.findOne({
      _id: candidateId,
      ownerId: req.user._id,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Enforce shortlist threshold rule:
    // Candidate can ONLY be shortlisted if overall match score is >= recruiter shortlist threshold (default 80%)
    if (reviewStatus === 'Shortlisted') {
      const job = await Job.findById(candidate.jobId);
      const threshold = job?.shortlistThreshold ?? 80;
      if (candidate.overallScore < threshold) {
        return res.status(400).json({
          success: false,
          message: `Candidate cannot be shortlisted: Match score of ${candidate.overallScore}% is below the required shortlist threshold of ${threshold}%.`,
          requiredThreshold: threshold,
          candidateScore: candidate.overallScore,
        });
      }
    }

    candidate.reviewStatus = reviewStatus;
    if (req.body.notes !== undefined) {
      candidate.recruiterNotes = req.body.notes;
    }
    await candidate.save();

    res.json({
      success: true,
      message: `Candidate marked as ${reviewStatus}.`,
      candidate,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add or update recruiter notes for candidate
// @route   POST /api/candidates/:candidateId/notes
// @access  Private
const addCandidateNote = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { notes } = req.body;

    const candidate = await CandidateEvaluation.findOne({
      _id: candidateId,
      ownerId: req.user._id,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    candidate.recruiterNotes = notes || '';
    await candidate.save();

    res.json({
      success: true,
      message: 'Recruiter notes saved successfully.',
      candidate,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update shortlist threshold percentage and optionally sync candidate review statuses
// @route   PUT /api/jobs/:jobId/shortlist-threshold
// @access  Private
const updateShortlistThreshold = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { autoApply = true } = req.body;
    const rawThreshold = req.body.threshold !== undefined ? req.body.threshold : req.body.shortlistThreshold;

    const numThreshold = Number(rawThreshold);
    if (isNaN(numThreshold) || numThreshold < 0 || numThreshold > 100) {
      return res.status(400).json({
        success: false,
        message: 'Shortlist threshold percentage must be a valid number between 0 and 100.',
      });
    }

    const job = await Job.findOne({ _id: jobId, ownerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    job.shortlistThreshold = numThreshold;
    await job.save();

    let autoShortlistedCount = 0;
    let revertedCount = 0;

    if (autoApply) {
      const evaluations = await CandidateEvaluation.find({ jobId: job._id, ownerId: req.user._id });
      for (const ev of evaluations) {
        if (ev.overallScore >= numThreshold) {
          // If candidate meets threshold and is currently un-reviewed, promote to Shortlisted
          if (ev.reviewStatus === 'Awaiting Review' || ev.reviewStatus === 'Under Review') {
            ev.reviewStatus = 'Shortlisted';
            if (!ev.recruiterNotes || !ev.recruiterNotes.includes('Shortlisted')) {
              ev.recruiterNotes = ev.recruiterNotes
                ? `${ev.recruiterNotes}\n• Shortlisted: Score (${ev.overallScore}%) meets shortlist threshold (≥ ${numThreshold}%).`
                : `Shortlisted: Score (${ev.overallScore}%) meets shortlist threshold (≥ ${numThreshold}%).`;
            }
            await ev.save();
            autoShortlistedCount++;
          }
        } else {
          // If candidate score is below threshold but was previously Shortlisted, revoke shortlist
          if (ev.reviewStatus === 'Shortlisted') {
            ev.reviewStatus = 'Awaiting Review';
            ev.recruiterNotes = ev.recruiterNotes
              ? `${ev.recruiterNotes}\n• Shortlist status adjusted: Score (${ev.overallScore}%) is below revised shortlist threshold (${numThreshold}%).`
              : `Shortlist status adjusted: Score (${ev.overallScore}%) is below revised shortlist threshold (${numThreshold}%).`;
            await ev.save();
            revertedCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Shortlist threshold updated to ${numThreshold}%.${
        autoApply
          ? ` Auto-shortlisted ${autoShortlistedCount} candidate(s), adjusted ${revertedCount} candidate(s).`
          : ''
      }`,
      shortlistThreshold: numThreshold,
      autoShortlistedCount,
      revertedCount,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  triggerRanking,
  getRankingsByJob,
  getCandidateAnalysis,
  compareCandidates,
  updateCandidateReview,
  addCandidateNote,
  updateShortlistThreshold,
};
