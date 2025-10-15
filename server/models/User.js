const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    // Store the hashed password here. The field is named `password` as requested.
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // do not return by default
    },
    phone: {
      type: String,
      trim: true,
    },
    preferredGenres: {
      type: [String],
      default: [],
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationOTPHash: { type: String, select: false },
    verificationOTPExpires: { type: Date },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique index on email
userSchema.index({ email: 1 }, { unique: true });

// Ensure sensitive fields are not leaked in JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);