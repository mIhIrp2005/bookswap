const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
// Removed temporary debug endpoints:
// router.get('/_debug/users', authController.debugListUsers);
// router.get('/_debug/email/:email', authController.debugCheckEmail);
// router.get('/_debug/indexes', authController.debugUserIndexes);
// router.get('/_debug/fix-indexes', authController.debugFixIndexes);

module.exports = router;