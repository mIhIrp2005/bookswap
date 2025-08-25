const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

function sendError(res, status, message, details) {
  return res.status(status).json({ message, ...(details ? { details } : {}) });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

function createMailTransport() {
  // Prefer Gmail if EMAIL_USER/EMAIL_PASS are set
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // use an App Password
      },
    });
  }
  // Otherwise generic SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

function buildOtpEmail(to, nameOrEmail, otp) {
  const from = process.env.SMTP_FROM || process.env.EMAIL_USER || 'no-reply@bookswap.local';
  return {
    from: `"BookSwap" <${from}>`,
    to,
    subject: 'Your BookSwap verification code',
    text: `
Hello ${nameOrEmail},

Your BookSwap verification code is: ${otp}

This code expires in 10 minutes.

If you did not request this, you can ignore this email.

— BookSwap Team
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5;">
        <p>Hello ${nameOrEmail},</p>
        <p>Your BookSwap verification code is:</p>
        <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>— BookSwap Team</p>
      </div>
    `,
  };
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

    const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
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
      role: 'user',
      isVerified: false
    });

    // Generate and store OTP
    const otp = generateOtp();
    user.verificationOTPHash = await bcrypt.hash(otp, 10);
    user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Try to send email
    try {
      const transporter = createMailTransport();
      if (transporter) {
        await transporter.sendMail(buildOtpEmail(user.email, user.name || user.email, otp));
        return res.status(201).json({
          message: 'Verification code sent to your email.',
          userId: user._id,
          email: user.email,
        });
      } else {
        // Dev fallback (no email configured)
        return res.status(201).json({
          message: 'Email service not configured. Showing code for development.',
          userId: user._id,
          email: user.email,
          otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
        });
      }
    } catch (mailErr) {
      console.error('OTP email send failed:', mailErr?.message || mailErr);
      // Dev fallback if email fails
      return res.status(201).json({
        message: 'Could not send email. Showing code for development.',
        userId: user._id,
        email: user.email,
        otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    }
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

    if (!user.isVerified) {
      return sendError(res, 403, 'Please verify your email before logging in.');
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

// Verify email with OTP
exports.verifyEmail = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return sendError(res, 400, 'Email and OTP are required');
    }

    const user = await User.findOne({ email }).select('+verificationOTPHash +verificationOTPExpires');
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    if (user.isVerified) {
      return res.status(200).json({ message: 'Email already verified. You can login.' });
    }
    if (!user.verificationOTPHash || !user.verificationOTPExpires) {
      return sendError(res, 400, 'No verification code found. Please request a new code.');
    }
    if (new Date() > new Date(user.verificationOTPExpires)) {
      return sendError(res, 400, 'Verification code expired. Please request a new code.');
    }

    const ok = await bcrypt.compare(otp, user.verificationOTPHash);
    if (!ok) {
      return sendError(res, 400, 'Invalid verification code.');
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.verificationOTPHash = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();

    // Issue token upon successful verification
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      message: 'Email verified successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return sendError(res, 500, 'Email verification failed', error.message);
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return sendError(res, 400, 'Email is required');
    }
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    if (user.isVerified) {
      return res.status(200).json({ message: 'Email already verified. You can login.' });
    }

    const otp = generateOtp();
    user.verificationOTPHash = await bcrypt.hash(otp, 10);
    user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      const transporter = createMailTransport();
      if (transporter) {
        await transporter.sendMail(buildOtpEmail(user.email, user.name || user.email, otp));
        return res.status(200).json({ message: 'Verification code resent to your email.' });
      } else {
        return res.status(200).json({
          message: 'Email service not configured. Showing code for development.',
          otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
        });
      }
    } catch (mailErr) {
      console.error('Resend OTP email failed:', mailErr?.message || mailErr);
      return res.status(200).json({
        message: 'Could not send email. Showing code for development.',
        otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
      });
    }
  } catch (error) {
    return sendError(res, 500, 'Failed to resend verification code', error.message);
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