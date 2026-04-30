// backend/src/config/twilio.js

'use strict';

const twilio = require('twilio');
const logger = require('../utils/logger');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Missing Twilio credentials in .env');
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Trial mode note ───────────────────────────────────────────────────────────
// Trial accounts can ONLY send to verified numbers in Twilio Console.
// Verify at: console.twilio.com → Phone Numbers → Verified Caller IDs → Add
// Messages will include prefix: "Sent from your Twilio trial account - ..."
// Upgrade to paid when going live — no code changes needed.

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const fromNumber       = process.env.TWILIO_PHONE_NUMBER;
const isTrial          = process.env.TWILIO_TRIAL === 'true';

// ── OTP via Twilio Verify ─────────────────────────────────────────────────────
// Twilio handles: code generation, expiry (10 min), delivery, verification
// We never see or store the OTP ourselves — cleaner and more secure
const Verify = {
  send: (to) =>
    client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to, channel: 'sms' }),

  check: (to, code) =>
    client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to, code }),
};

// ── Raw SMS for notifications ─────────────────────────────────────────────────
// Use this for order updates, booking confirmations, etc.
// Always format numbers in E.164: +91XXXXXXXXXX for India
const SMS = {
  send: async (to, message) => {
    try {
      // Ensure E.164 format
      const formatted = to.startsWith('+') ? to : `+91${to}`;
      const res = await client.messages.create({
        body: message,
        from: fromNumber,
        to:   formatted,
      });
      logger.info(`SMS sent to ${formatted} — SID: ${res.sid}`);
      return res;
    } catch (err) {
      logger.error(`SMS failed to ${to}:`, err.message);
      throw err;
    }
  },
};

module.exports = { client, verifyServiceSid, fromNumber, isTrial, Verify, SMS };