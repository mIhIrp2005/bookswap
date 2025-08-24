const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    author: { type: String, required: [true, 'Author is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    available: { type: Boolean, default: true },

    // Reference to the user who added the book
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Optional fields (kept for compatibility, but not required)
    condition: { type: String },
    genre: { type: String },
    imageURL: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);