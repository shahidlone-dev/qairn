// backend/src/routes/debug.routes.js
// ⚠️ REMOVE THIS FILE BEFORE GOING TO PRODUCTION

'use strict';

const express = require('express');
const router  = express.Router();
const { client, verifyServiceSid, fromNumber, Verify, SMS } = require('../config/twilio');
const logger  = require('../utils/logger');

// ── Test 1: Check credentials are loaded ──────────────────────────────────────
// GET /debug/twilio/config
router.get('/config', (req, res) => {
  res.json({
    accountSid:      process.env.TWILIO_ACCOUNT_SID?.slice(0, 8) + '...',
    authToken:       process.env.TWILIO_AUTH_TOKEN    ? '✅ loaded' : '❌ missing',
    fromNumber:      fromNumber                        || '❌ missing',
    verifyServiceSid:verifyServiceSid                  || '❌ missing',
    isTrial:         process.env.TWILIO_TRIAL,
  });
});

// ── Test 2: Validate credentials with Twilio API ──────────────────────────────
// GET /debug/twilio/account
router.get('/account', async (req, res) => {
  try {
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    res.json({
      success:    true,
      status:     account.status,
      type:       account.type,
      friendlyName: account.friendlyName,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      code:    err.code,
      message: err.message,
      hint:    diagnose(err.code),
    });
  }
});

// ── Test 3: Send raw SMS ──────────────────────────────────────────────────────
// POST /debug/twilio/sms  { "to": "+91XXXXXXXXXX" }
router.post('/sms', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to is required' });

  try {
    const result = await SMS.send(to, 'qaaf test SMS — working ✅');
    res.json({ success: true, sid: result.sid, status: result.status });
  } catch (err) {
    res.status(400).json({
      success: false,
      code:    err.code,
      message: err.message,
      hint:    diagnose(err.code),
    });
  }
});

// ── Test 4: Send OTP via Verify service ──────────────────────────────────────
// POST /debug/twilio/otp  { "to": "+91XXXXXXXXXX" }
router.post('/otp', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to is required' });

  const formatted = to.startsWith('+') ? to : `+91${to}`;

  try {
    const result = await Verify.send(formatted);
    res.json({ success: true, status: result.status, to: result.to });
  } catch (err) {
    res.status(400).json({
      success: false,
      code:    err.code,
      message: err.message,
      hint:    diagnose(err.code),
    });
  }
});

// ── Test 5: Check OTP code ────────────────────────────────────────────────────
// POST /debug/twilio/verify  { "to": "+91XXXXXXXXXX", "code": "123456" }
router.post('/verify', async (req, res) => {
  const { to, code } = req.body;
  if (!to || !code) return res.status(400).json({ error: 'to and code required' });

  const formatted = to.startsWith('+') ? to : `+91${to}`;

  try {
    const result = await Verify.check(formatted, code);
    res.json({ success: true, status: result.status, valid: result.status === 'approved' });
  } catch (err) {
    res.status(400).json({
      success: false,
      code:    err.code,
      message: err.message,
      hint:    diagnose(err.code),
    });
  }
});

// ── Error code hints ──────────────────────────────────────────────────────────
function diagnose(code) {
  const hints = {
    20003: '❌ Auth failed — wrong Account SID or Auth Token in .env',
    20404: '❌ Verify Service SID not found — check TWILIO_VERIFY_SERVICE_SID in .env',
    20008: '❌ Trial account — this number is not verified. Go to Twilio Console → Phone Numbers → Verified Caller IDs → Add this number',
    21608: '❌ Trial account — unverified number. Verify it in Twilio Console first',
    21211: '❌ Invalid phone number format — must be E.164 like +919876543210',
    21219: '❌ "To" number not verified for trial account',
    60200: '❌ Invalid Verify Service SID — create one at console.twilio.com → Verify → Services',
    60203: '❌ Max send attempts reached for this number — wait 10 minutes',
    60212: '❌ Too many concurrent requests',
    null:  '❓ Unknown error — check your .env values and Twilio console',
  };
  return hints[code] ?? hints[null];
}

// ── Test 6: Debug username check ─────────────────────────────────────────────
// GET /debug/twilio/username?u=test.user
router.get('/username', async (req, res) => {
  const username = req.query.u;
  if (!username) return res.status(400).json({ error: 'u query param required' });

  const { redis, keys } = require('../config/redis');
  const supabase        = require('../config/supabase');
  const BloomService    = require('../services/bloom.service');

  const lower = username.toLowerCase().trim();

  // Check bloom
  let bloomResult, bloomError;
  try {
    bloomResult = await BloomService.mightExist(lower);
  } catch (e) {
    bloomError = e.message;
  }

  // Check DB directly
  let dbResult, dbError;
  try {
    const { data, error } = await supabase
      .from('users').select('id').eq('username', lower).maybeSingle();
    dbResult = data;
    dbError  = error?.message;
  } catch (e) {
    dbError = e.message;
  }

  res.json({
    username:   lower,
    bloom:      { mightExist: bloomResult, error: bloomError ?? null },
    db:         { exists: !!dbResult,      error: dbError   ?? null },
    conclusion: !dbResult ? '✅ available' : '❌ taken',
  });
});

module.exports = router;