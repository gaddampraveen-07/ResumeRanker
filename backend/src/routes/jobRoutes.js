const express = require('express');
const router = express.Router();
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');
const {
  uploadResumes,
  getResumesByJob,
  loadSampleResumes,
} = require('../controllers/resumeController');
const {
  triggerRanking,
  getRankingsByJob,
  getCandidateAnalysis,
  compareCandidates,
  updateShortlistThreshold,
} = require('../controllers/rankingController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Base job endpoints
router.route('/')
  .post(protect, createJob)
  .get(protect, getJobs);

router.route('/:jobId')
  .get(protect, getJobById)
  .put(protect, updateJob)
  .delete(protect, deleteJob);

// Nested resume endpoints
router.route('/:jobId/resumes')
  .post(protect, upload.array('resumes', 20), uploadResumes)
  .get(protect, getResumesByJob);

router.post('/:jobId/load-sample-resumes', protect, loadSampleResumes);

// Nested ranking endpoints
router.post('/:jobId/rank', protect, triggerRanking);
router.get('/:jobId/rankings', protect, getRankingsByJob);
router.put('/:jobId/shortlist-threshold', protect, updateShortlistThreshold);
router.get('/:jobId/candidates/:candidateId/analysis', protect, getCandidateAnalysis);
router.post('/:jobId/candidates/compare', protect, compareCandidates);

module.exports = router;
