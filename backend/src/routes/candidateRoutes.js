const express = require('express');
const router = express.Router();
const {
  updateCandidateReview,
  addCandidateNote,
} = require('../controllers/rankingController');
const { protect } = require('../middleware/auth');

router.patch('/:candidateId/review', protect, updateCandidateReview);
router.put('/:candidateId/review', protect, updateCandidateReview);
router.post('/:candidateId/notes', protect, addCandidateNote);

module.exports = router;
