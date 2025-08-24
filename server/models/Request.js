const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
});

module.exports = mongoose.model('Request', requestSchema);