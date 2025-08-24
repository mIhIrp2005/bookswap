// Top-level helpers and addBook
const Book = require('../models/Book');
const fs = require('fs');
const path = require('path');

function sendError(res, status, message, details) {
  return res.status(status).json({ message, ...(details ? { details } : {}) });
}

// Helper to make image URLs absolute
function makeAbsoluteUrl(req, url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${req.protocol}://${req.get('host')}${url}`;
  return `${req.protocol}://${req.get('host')}/${url}`;
}

exports.addBook = async (req, res) => {
  try {
    // Multer (when used) will populate req.body (text fields) and req.file (uploaded image)
    const { title, author, description, available, condition, genre } = req.body || {};

    if (!title || !author || !description) {
      return sendError(res, 400, 'Title, author and description are required');
    }

    // Build imageURL from uploaded file if provided (ensure absolute URL)
    const uploadedUrl = req.file ? `/uploads/${req.file.filename}` : (req.body?.imageURL || undefined);
    const imageURL = uploadedUrl ? makeAbsoluteUrl(req, uploadedUrl) : undefined;

    const book = await Book.create({
      title,
      author,
      description,
      condition,
      genre,
      imageURL,
      available: typeof available === 'boolean' ? available : true,
      ownerId: req.user.id,
    });

    return res.status(201).json(book);
  } catch (error) {
    return sendError(res, 500, 'Failed to add book', error.message);
  }
};

// getAllBooks
exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    const normalized = books.map((b) => {
      const obj = b.toObject();
      if (obj.imageURL) obj.imageURL = makeAbsoluteUrl(req, obj.imageURL);
      return obj;
    });
    res.status(200).json(normalized);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch books', error.message);
  }
};

// getBookById
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id).populate({ path: 'ownerId', select: 'name email' });
    if (!book) return sendError(res, 404, 'Book not found');
    const obj = book.toObject();
    if (obj.imageURL) obj.imageURL = makeAbsoluteUrl(req, obj.imageURL);
    return res.status(200).json({ ...obj, owner: obj.ownerId });
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch book', error.message);
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBook = await Book.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json(updatedBook);
  } catch (error) {
    return sendError(res, 500, 'Failed to update book', error.message);
  }
};

// Return only books created by the authenticated user
exports.getMyBooks = async (req, res) => {
  try {
    const myBooks = await Book.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    const normalized = myBooks.map((b) => {
      const obj = b.toObject();
      if (obj.imageURL) obj.imageURL = makeAbsoluteUrl(req, obj.imageURL);
      return obj;
    });
    return res.status(200).json(normalized);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch your books', error.message);
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return sendError(res, 404, 'Book not found');
    }
    if (String(book.ownerId) !== String(req.user.id)) {
      return sendError(res, 403, 'You are not authorized to delete this book');
    }

    if (book.imageURL) {
      try {
        let imagePath = book.imageURL;
        try {
          const u = new URL(imagePath);
          imagePath = u.pathname;
        } catch (e) {}
        const filename = path.basename(imagePath);
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        // ignore file deletion errors
      }
    }

    await Book.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Failed to delete book', error.message);
  }
};