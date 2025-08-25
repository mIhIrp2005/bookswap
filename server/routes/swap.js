// Top of file imports (remove nodemailer)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/authMiddleware');
const SwapRequest = require('../models/SwapRequest');
const Book = require('../models/Book');
const User = require('../models/User');
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

// Protect all swap routes
router.use(auth);

// POST /api/swaps - create a new swap request
router.post('/', async (req, res) => {
  try {
    const fromUser = req.user.id;
    const { offeredBook, requestedBook, toUser } = req.body || {};

    if (!offeredBook || !requestedBook || !toUser) {
      return res.status(400).json({ message: 'offeredBook, requestedBook and toUser are required' });
    }

    // Load and validate ownership
    const [offered, requested] = await Promise.all([
      Book.findById(offeredBook),
      Book.findById(requestedBook),
    ]);

    if (!offered || !requested) {
      return res.status(404).json({ message: 'One or both books not found' });
    }

    // fromUser must own the offered book
    if (String(offered.ownerId) !== String(fromUser)) {
      return res.status(403).json({ message: 'You do not own the offered book' });
    }
    // toUser must own the requested book
    if (String(requested.ownerId) !== String(toUser)) {
      return res.status(400).json({ message: 'Requested book is not owned by the target user' });
    }
    if (String(fromUser) === String(toUser)) {
      return res.status(400).json({ message: 'You cannot create a swap with yourself' });
    }

    // Avoid duplicate pending requests for the same pair
    const existing = await SwapRequest.findOne({
      fromUser,
      toUser,
      offeredBook,
      requestedBook,
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ message: 'A pending swap request already exists for these books' });
    }

    const swap = await SwapRequest.create({
      fromUser,
      toUser,
      offeredBook,
      requestedBook,
    });

    return res.status(201).json({ message: 'Swap request created', swap });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create swap request', details: error.message });
  }
});

// GET /api/swaps/incoming - get swaps where toUser = current user
router.get('/incoming', async (req, res) => {
  try {
    const toUser = req.user.id;
    const swaps = await SwapRequest.find({ toUser })
      .sort({ createdAt: -1 })
      .populate({ path: 'fromUser', select: 'name email' })
      .populate({ path: 'offeredBook', select: 'title imageURL' })
      .populate({ path: 'requestedBook', select: 'title imageURL' });

    return res.status(200).json(swaps);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch incoming swaps', details: error.message });
  }
});

// GET /api/swaps/outgoing - get swaps where fromUser = current user
router.get('/outgoing', async (req, res) => {
  try {
    const fromUser = req.user.id;
    const swaps = await SwapRequest.find({ fromUser })
      .sort({ createdAt: -1 })
      .populate({ path: 'toUser', select: 'name email' })
      .populate({ path: 'offeredBook', select: 'title imageURL' })
      .populate({ path: 'requestedBook', select: 'title imageURL' });

    return res.status(200).json(swaps);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch outgoing swaps', details: error.message });
  }
});

// POST /api/swaps/:id/accept - accept the swap and exchange ownership
// In router.post('/:id/accept', ...) – replace the mail/transporter block with notifications only
router.post('/:id/accept', async (req, res) => {
  try {
    const id = req.params.id;
    const currentUser = req.user.id;

    const swap = await SwapRequest.findById(id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });
    if (swap.status !== 'pending') {
      return res.status(400).json({ message: `Cannot accept a ${swap.status} request` });
    }
    if (String(swap.toUser) !== String(currentUser)) {
      return res.status(403).json({ message: 'Only the recipient can accept this swap' });
    }

    // Fetch both books fresh
    const [offered, requested] = await Promise.all([
      Book.findById(swap.offeredBook),
      Book.findById(swap.requestedBook),
    ]);
    if (!offered || !requested) {
      return res.status(404).json({ message: 'One or both books not found' });
    }

    // Validate current ownership has not changed
    if (String(offered.ownerId) !== String(swap.fromUser) || String(requested.ownerId) !== String(swap.toUser)) {
      return res.status(409).json({ message: 'Ownership changed since request was created. Please retry.' });
    }

    // Swap owners
    offered.ownerId = swap.toUser;
    requested.ownerId = swap.fromUser;

    await Promise.all([offered.save(), requested.save()]);

    swap.status = 'completed';
    await swap.save();

    // Create in-app notifications only (SMTP/email sending removed)
    try {
      const [userA, userB] = await Promise.all([
        User.findById(swap.fromUser).select('name email'),
        User.findById(swap.toUser).select('name email'),
      ]);

      await Promise.all([
        Notification.create({
          userId: userA._id,
          message: `Your swap with ${userB.name || userB.email} is confirmed! Contact: ${userB.email}`,
        }),
        Notification.create({
          userId: userB._id,
          message: `Your swap with ${userA.name || userA.email} is confirmed! Contact: ${userA.email}`,
        }),
      ]);
    } catch (notifyErr) {
      console.error('Notification step failed:', notifyErr?.message || notifyErr);
      // Continue without failing the swap
    }

    return res.status(200).json({ message: 'Swap accepted and completed', swap });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to accept swap', details: error.message });
  }
});

// POST /api/swaps/:id/reject - reject the swap
router.post('/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    const currentUser = req.user.id;

    const swap = await SwapRequest.findById(id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });
    if (swap.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject a ${swap.status} request` });
    }
    if (String(swap.toUser) !== String(currentUser)) {
      return res.status(403).json({ message: 'Only the recipient can reject this swap' });
    }

    swap.status = 'rejected';
    await swap.save();

    return res.status(200).json({ message: 'Swap rejected', swap });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reject swap', details: error.message });
  }
});

module.exports = router;