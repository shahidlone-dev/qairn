// backend/server.js
'use strict';

require('dotenv').config();

const app    = require('./app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 qaaf backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// ── HTTP-level timeouts ───────────────────────────────────────────────────────
// Node's default is 0 (no timeout) — without these, a stalled Cloudinary upload
// leaves the socket open forever and the client never gets a response.
//
// headersTimeout  — how long to wait for the client to send request headers
// keepAliveTimeout — how long to keep an idle keep-alive socket open
// timeout          — the socket inactivity timeout (applies to the full request
//                    lifecycle including body streaming to Cloudinary)
//
// 25 minutes covers our worst-case 100MB video upload with Cloudinary's
// chunked upload_large. Set lower (e.g. 5 min) for image-only endpoints if
// you add per-route timeouts later.
server.headersTimeout  = 25 * 60 * 1000; // 25 min
server.keepAliveTimeout = 65 * 1000;     // 65s (> ALB/nginx 60s default)
server.timeout          = 25 * 60 * 1000; // 25 min socket inactivity timeout

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors ──────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});