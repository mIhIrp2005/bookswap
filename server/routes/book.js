const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const bookController = require('../controllers/book');
const auth = require('../middleware/authMiddleware');

// Configure multer storage to save files to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() - Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

// Public routes
router.get('/all', bookController.getAllBooks);
// Put specific/protected route BEFORE the dynamic :id route
router.get('/mine', auth, bookController.getMyBooks);
router.get('/:id', bookController.getBookById);

// Protected routes
router.post('/add', auth, upload.single('image'), bookController.addBook);
router.put('/:id', auth, bookController.updateBook);
router.delete('/:id', auth, bookController.deleteBook);

module.exports = router;