const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateEvaluation = require('../models/CandidateEvaluation');

// @desc    Get aggregate analytics for recruiter dashboard
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    const [
      totalJobs,
      totalResumes,
      completedResumes,
      failedResumes,
      evaluations,
      shortlistedCount,
      underReviewCount,
      awaitingCount,
      recentJobs,
      recentResumes,
      allJobs,
    ] = await Promise.all([
      Job.countDocuments({ ownerId }),
      Resume.countDocuments({ ownerId }),
      Resume.countDocuments({ ownerId, processingStatus: 'Completed' }),
      Resume.countDocuments({ ownerId, processingStatus: 'Failed' }),
      CandidateEvaluation.find({ ownerId }),
      CandidateEvaluation.countDocuments({ ownerId, reviewStatus: 'Shortlisted' }),
      CandidateEvaluation.countDocuments({ ownerId, reviewStatus: 'Under Review' }),
      CandidateEvaluation.countDocuments({ ownerId, reviewStatus: 'Awaiting Review' }),
      Job.find({ ownerId }).sort({ createdAt: -1 }).limit(5),
      Resume.find({ ownerId }).sort({ createdAt: -1 }).limit(6).populate('jobId', 'title company'),
      Job.find({ ownerId }).select('title department company status createdAt'),
    ]);

    // Average match score
    const avgScore =
      evaluations.length > 0
        ? Math.round(
            (evaluations.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) /
              evaluations.length) *
              10
          ) / 10
        : 0;

    // Score distribution buckets: 0-40, 41-60, 61-80, 81-100
    const scoreDistribution = [
      { range: '0-40% (Low)', count: 0, fill: '#EF4444' },
      { range: '41-60% (Moderate)', count: 0, fill: '#F59E0B' },
      { range: '61-80% (Good)', count: 0, fill: '#3B82F6' },
      { range: '81-100% (Strong)', count: 0, fill: '#10B981' },
    ];

    evaluations.forEach((ev) => {
      const s = ev.overallScore || 0;
      if (s <= 40) scoreDistribution[0].count++;
      else if (s <= 60) scoreDistribution[1].count++;
      else if (s <= 80) scoreDistribution[2].count++;
      else scoreDistribution[3].count++;
    });

    // Candidates count per job
    const jobCandidatesMap = {};
    for (const job of allJobs) {
      jobCandidatesMap[job._id.toString()] = {
        name: job.title.length > 18 ? job.title.substring(0, 18) + '...' : job.title,
        jobId: job._id,
        resumes: 0,
        averageScore: 0,
      };
    }

    const allJobResumes = await Resume.find({ ownerId });
    allJobResumes.forEach((r) => {
      const jId = r.jobId?.toString();
      if (jobCandidatesMap[jId]) {
        jobCandidatesMap[jId].resumes++;
      }
    });

    // Compute average score per job
    const jobEvals = {};
    evaluations.forEach((ev) => {
      const jId = ev.jobId?.toString();
      if (!jobEvals[jId]) jobEvals[jId] = [];
      jobEvals[jId].push(ev.overallScore);
    });

    Object.keys(jobCandidatesMap).forEach((jId) => {
      if (jobEvals[jId] && jobEvals[jId].length > 0) {
        const sum = jobEvals[jId].reduce((a, b) => a + b, 0);
        jobCandidatesMap[jId].averageScore = Math.round(sum / jobEvals[jId].length);
      }
    });

    const candidatesPerJob = Object.values(jobCandidatesMap).slice(0, 7);

    // Processing status chart data
    const processingStatusData = [
      { name: 'Completed', value: completedResumes, color: '#10B981' },
      { name: 'Pending / Processing', value: totalResumes - completedResumes - failedResumes, color: '#3B82F6' },
      { name: 'Failed', value: failedResumes, color: '#EF4444' },
    ];

    // Review status chart data
    const reviewStatusData = [
      { name: 'Awaiting Review', value: awaitingCount, color: '#64748B' },
      { name: 'Under Review', value: underReviewCount, color: '#F59E0B' },
      { name: 'Shortlisted', value: shortlistedCount, color: '#10B981' },
    ];

    res.json({
      success: true,
      stats: {
        totalJobs,
        totalResumes,
        completedResumes,
        failedResumes,
        averageScore: avgScore,
        shortlistedCount,
        underReviewCount,
        awaitingReviewCount: awaitingCount,
      },
      charts: {
        scoreDistribution,
        candidatesPerJob,
        processingStatus: processingStatusData,
        reviewStatus: reviewStatusData,
      },
      recentActivity: {
        jobs: recentJobs,
        resumes: recentResumes.map((r) => ({
          id: r._id,
          fileName: r.originalFileName,
          candidateName: r.candidateDetails?.name || 'Candidate',
          jobTitle: r.jobId?.title || 'Unknown Job',
          status: r.processingStatus,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed analytics for a specific job
// @route   GET /api/analytics/jobs/:jobId
// @access  Private
const getJobAnalytics = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const ownerId = req.user._id;

    const job = await Job.findOne({ _id: jobId, ownerId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const evaluations = await CandidateEvaluation.find({ jobId, ownerId }).sort({ rank: 1 });
    const resumes = await Resume.find({ jobId, ownerId });

    const total = resumes.length;
    const completed = resumes.filter((r) => r.processingStatus === 'Completed').length;
    const failed = resumes.filter((r) => r.processingStatus === 'Failed').length;

    const avgScore =
      evaluations.length > 0
        ? Math.round(
            (evaluations.reduce((a, b) => a + b.overallScore, 0) / evaluations.length) * 10
          ) / 10
        : 0;

    // Component score averages
    const componentAverages = {
      requiredSkills: 0,
      preferredSkills: 0,
      textSimilarity: 0,
      experience: 0,
      qualification: 0,
    };

    if (evaluations.length > 0) {
      evaluations.forEach((ev) => {
        componentAverages.requiredSkills += ev.componentScores?.requiredSkills || 0;
        componentAverages.preferredSkills += ev.componentScores?.preferredSkills || 0;
        componentAverages.textSimilarity += ev.componentScores?.textSimilarity || 0;
        componentAverages.experience += ev.componentScores?.experience || 0;
        componentAverages.qualification += ev.componentScores?.qualification || 0;
      });

      const count = evaluations.length;
      Object.keys(componentAverages).forEach((k) => {
        componentAverages[k] = Math.round((componentAverages[k] / count) * 10) / 10;
      });
    }

    // Skill coverage: percentage of candidates possessing each required skill
    const skillCoverage = job.requiredSkills.map((skill) => {
      const haveSkill = evaluations.filter((ev) =>
        ev.matchingSkills.some((s) => s.toLowerCase() === skill.toLowerCase())
      ).length;
      return {
        skill,
        candidateCount: haveSkill,
        percentage: evaluations.length > 0 ? Math.round((haveSkill / evaluations.length) * 100) : 0,
      };
    });

    res.json({
      success: true,
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
      },
      stats: {
        totalResumes: total,
        completed,
        failed,
        averageScore: avgScore,
        candidateCount: evaluations.length,
      },
      componentAverages,
      skillCoverage,
      topCandidates: evaluations.slice(0, 5).map((e) => ({
        id: e._id,
        name: e.candidateName,
        score: e.overallScore,
        rank: e.rank,
        reviewStatus: e.reviewStatus,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardAnalytics,
  getJobAnalytics,
};
