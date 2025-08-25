const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

// All routes require auth
router.use(auth);

// GET /api/notifications - get current user's notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch notifications', details: e.message });
  }
});

module.exports = router;