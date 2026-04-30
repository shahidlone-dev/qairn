// backend/src/validations/auth.validation.js
'use strict';

const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const rules = {
  phone: body('phone')
    .trim()
    .matches(/^\+?[\d\s\-()]{7,15}$/)
    .withMessage('Invalid phone number'),

  code: body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),

  username: body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Only letters, numbers, . and _ allowed')
    .matches(/[._]/)
    .withMessage('Must contain at least one . or _'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Min 8 characters')
    .matches(/[A-Z]/).withMessage('One uppercase letter required')
    .matches(/\d/).withMessage('One number required')
    .matches(/[^a-zA-Z0-9]/).withMessage('One special character required'),

  identifier: body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Phone or username is required'),
};

module.exports = {
  sendOtp:      [rules.phone,                              validate],
  verifyOtp:    [rules.phone, rules.code,                  validate],
  checkUsername:[rules.username,                           validate],
  signup:       [rules.username, rules.phone, rules.password, validate],
  login:        [rules.identifier, rules.password,         validate],
  resetPassword:[rules.phone, rules.password,              validate],
};