const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },       // user initiating
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },         // user being asked
  offeredBook: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  requestedBook: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SwapRequest', swapRequestSchema);