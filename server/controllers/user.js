const User = require('../models/User');

exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-passwordHash');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCurrentUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCurrentUserProfile = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name.trim();
    if (typeof req.body.phone === 'string') updates.phone = req.body.phone.trim();

    if (Array.isArray(req.body.preferredGenres)) {
      updates.preferredGenres = req.body.preferredGenres.map(g => String(g).trim()).filter(Boolean);
    } else if (typeof req.body.preferredGenres === 'string') {
      updates.preferredGenres = req.body.preferredGenres
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update profile', details: error.message });
  }
};