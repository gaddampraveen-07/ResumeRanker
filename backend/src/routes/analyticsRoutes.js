const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getJobAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/jobs/:jobId', protect, getJobAnalytics);

module.exports = router;
