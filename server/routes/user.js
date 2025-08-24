const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const jwt = require('jsonwebtoken');

const verify = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/profile', verify, userController.getCurrentUserProfile);
router.put('/profile', verify, userController.updateCurrentUserProfile);
router.get('/:id', userController.getUserProfile);

module.exports = router;