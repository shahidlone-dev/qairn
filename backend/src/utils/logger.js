// backend/src/utils/logger.js

'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf, json } = format;

const devFormat = printf(({ level, message, timestamp }) =>
  `${timestamp} [${level}]: ${message}`
);

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production'
    ? combine(timestamp(), json())
    : combine(timestamp({ format: 'HH:mm:ss' }), colorize(), devFormat),
  transports: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({ filename: 'logs/error.log',  level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});

module.exports = logger;