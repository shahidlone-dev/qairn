// backend/server.js

'use strict';

require('dotenv').config();

const app    = require('./app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 qaaf backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});

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