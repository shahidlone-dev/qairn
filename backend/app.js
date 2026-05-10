// backend/app.js

'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const logger     = require('./src/utils/logger');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   () => process.env.NODE_ENV === 'test',
}));

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)       || 100,
  message:  { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'qaaf API is running', ts: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./src/routes/auth.routes'));
app.use('/api/users',       require('./src/routes/user.routes'));
app.use('/api/posts',       require('./src/routes/post.routes'));
app.use('/api/collections', require('./src/routes/collection.routes')); // <-- ADDED THIS LINE
app.use('/api/market',      require('./src/routes/market.routes'));
app.use('/api/services',    require('./src/routes/service.routes'));
app.use('/api/chats',       require('./src/routes/chat.routes'));
app.use('/api/upload',      require('./src/routes/upload.routes'));
app.use('/api/stories',     require('./src/routes/story.routes'));

// ── Debug routes (dev only — remove before production) ────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/debug/twilio', require('./src/routes/debug.routes'));
  logger.warn('⚠️  Debug routes enabled — disable in production');
}

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl}`);

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;