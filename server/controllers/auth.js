const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function sendError(res, status, message, details) {
  return res.status(status).json({ message, ...(details ? { details } : {}) });
}

exports.register = async (req, res) => {
  try {
    // Accept both name and legacy username
    const rawName = (req.body.name || req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const phone = String(req.body.phone || '').trim();
    const preferredGenres = Array.isArray(req.body.genres) ? req.body.genres : [];

    if (!rawName || !email || !password) {
      return sendError(res, 400, 'Name, email and password are required');
    }

    console.log('[auth.register] Incoming email:', email);

    const name = rawName;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(res, 400, 'Invalid email address');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters long');
    }

    const existing = await User.findOne({ email });
    console.log('[auth.register] findOne result for', email, '=>', !!existing);
    if (existing) {
      console.log('[auth.register] Duplicate detected for email:', email, 'existingId:', existing._id.toString());
      return sendError(res, 409, 'Email is already registered');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashed, 
      phone, 
      preferredGenres, 
      role: 'user' 
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone,
        preferredGenres: user.preferredGenres
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'Email is already registered',
        details: {
          keyPattern: error?.keyPattern || null,
          keyValue: error?.keyValue || null,
          message: error?.message || null
        }
      });
    }
    return sendError(res, 500, 'Registration failed', error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return sendError(res, 500, 'Login failed', error.message);
  }
};

exports.debugListUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('email name createdAt');
    return res.json({
      db: require('mongoose').connection.name,
      count: users.length,
      emails: users.map(u => u.email),
    });
  } catch (e) {
    return res.status(500).json({ message: 'Debug list users failed', error: e.message });
  }
};

exports.debugCheckEmail = async (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('_id email');
    return res.json({
      db: require('mongoose').connection.name,
      email,
      exists: !!user,
      id: user?._id || null
    });
  } catch (e) {
    return res.status(500).json({ message: 'Debug check email failed', error: e.message });
  }
};

exports.debugUserIndexes = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const conn = mongoose.connection;
    const idx = await conn.collection('users').indexes();
    return res.json({
      db: conn.name,
      collection: 'users',
      indexes: idx
    });
  } catch (e) {
    return res.status(500).json({ message: 'Debug indexes failed', error: e.message });
  }
};

exports.debugCheckEmail = async (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('_id email');
    return res.json({
      db: require('mongoose').connection.name,
      email,
      exists: !!user,
      id: user?._id || null
    });
  } catch (e) {
    return res.status(500).json({ message: 'Debug check email failed', error: e.message });
  }
};

exports.debugFixIndexes = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const conn = mongoose.connection;
    const coll = conn.collection('users');
    const idx = await coll.indexes();
    const names = idx.map(i => i.name);

    const actions = [];

    // Drop the problematic unique index on username if present
    if (names.includes('username_1')) {
      await coll.dropIndex('username_1');
      actions.push('Dropped index username_1');
    } else {
      actions.push('Index username_1 not found');
    }

    // Ensure unique index on email exists and is unique
    const emailIndex = idx.find(i => i.name === 'email_1');
    if (!emailIndex) {
      await coll.createIndex({ email: 1 }, { unique: true });
      actions.push('Created unique index email_1');
    } else if (!emailIndex.unique) {
      await coll.dropIndex('email_1');
      await coll.createIndex({ email: 1 }, { unique: true });
      actions.push('Recreated unique index email_1 as unique');
    } else {
      actions.push('email_1 already unique');
    }

    return res.json({ db: conn.name, actions });
  } catch (e) {
    return res.status(500).json({ message: 'Fix indexes failed', error: e.message });
  }
};