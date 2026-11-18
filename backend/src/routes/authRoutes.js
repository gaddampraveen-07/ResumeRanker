const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/seed-demo', protect, async (req, res, next) => {
  try {
    const { seedDemoDataForUser } = require('../utils/demoData');
    const { force, shortlistThreshold } = req.body || {};
    const result = await seedDemoDataForUser(req.user._id, { force, shortlistThreshold });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
