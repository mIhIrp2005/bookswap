const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/book');
const swapRoutes = require('./routes/swap');
const notificationRoutes = require('./routes/notification');
const userRoutes = require('./routes/user');

dotenv.config();

const app = express();
app.set('trust proxy', true);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,           // e.g., https://bookswap-eight.vercel.app
  'https://bookswap-eight.vercel.app',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve static files from uploads so client can access images
app.use('/uploads', express.static(uploadsDir));

// ✅ Root route to prevent 404 on GET /
app.get('/', (req, res) => {
  res.send('📚 BookSwap API is running 🚀');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri =
    process.env.MONGO_URI_FALLBACK || process.env.MONGO_URI_LOCAL; // optional

  if (!primaryUri) {
    console.error(
      '❌ Missing environment variable MONGO_URI. Please set it in your server/.env file.'
    );
    process.exit(1);
  }

  try {
    // Connect using Mongoose v8 defaults (no deprecated options)
    await mongoose.connect(primaryUri);
    console.log('✅ MongoDB connected');
    console.log(`✅ Connected to database: ${mongoose.connection.name}`);

    app.listen(PORT, () =>
      console.log(`✅ Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error('❌ MongoDB connection error:', err?.message || err);

    const isSrvLookupError = /querySrv ENOTFOUND|ENOTFOUND _mongodb\._tcp/i.test(
      String(err?.message || '')
    );

    if (isSrvLookupError && fallbackUri) {
      console.log('⚠️ Attempting fallback MongoDB URI...');
      try {
        await mongoose.connect(fallbackUri);
        console.log('✅ MongoDB connected using fallback URI');
        app.listen(PORT, () =>
          console.log(`✅ Server running on http://localhost:${PORT}`)
        );
        return;
      } catch (fallbackErr) {
        console.error(
          '❌ Fallback MongoDB connection error:',
          fallbackErr?.message || fallbackErr
        );
      }
    }

    console.error(
      '❌ Failed to connect to MongoDB. Ensure your MONGO_URI is correct and accessible.'
    );
    process.exit(1);
  }
}

startServer();
