const Request = require('../models/Request');
const Book = require('../models/Book');

exports.sendRequest = async (req, res) => {
    try {
        const { bookId } = req.body;
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        const ownerId = book.ownerId;
        const newRequest = new Request({ requesterId: req.user.id, ownerId, bookId });
        await newRequest.save();
        res.status(201).json({ message: 'Request sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await Request.findByIdAndUpdate(id, { status: 'accepted' });
        res.status(200).json({ message: 'Request accepted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.declineRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await Request.findByIdAndUpdate(id, { status: 'declined' });
        res.status(200).json({ message: 'Request declined' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate({ path: 'requesterId', select: 'name' })
      .populate({ path: 'ownerId', select: 'name' })
      .populate({ path: 'bookId', select: 'title' });
    const mapped = requests.map(r => {
      const obj = r.toObject();
      return { ...obj, requester: obj.requesterId, owner: obj.ownerId, book: obj.bookId };
    });
    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};