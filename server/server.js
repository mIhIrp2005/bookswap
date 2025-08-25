const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/book');
const requestRoutes = require('./routes/request');
const userRoutes = require('./routes/user');
const swapRoutes = require('./routes/swap');
const notificationRoutes = require('./routes/notification');

dotenv.config();

const app = express();
app.use(cors());
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
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/notifications', notificationRoutes);

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
