const express = require('express');
const router = express.Router();
const {
  getResumeById,
  downloadResume,
  deleteResume,
  reprocessResume,
} = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');

router.get('/:resumeId', protect, getResumeById);
router.post('/:resumeId/reprocess', protect, reprocessResume);
router.get('/:resumeId/download', protect, downloadResume);
router.delete('/:resumeId', protect, deleteResume);

module.exports = router;
