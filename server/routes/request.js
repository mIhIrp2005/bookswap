const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request');
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

router.get('/', verify, requestController.getRequests);
router.post('/send', verify, requestController.sendRequest);
router.put('/:id/accept', verify, requestController.acceptRequest);
router.put('/:id/decline', verify, requestController.declineRequest);

module.exports = router;