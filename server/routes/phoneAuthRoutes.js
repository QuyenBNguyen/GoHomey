const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP } = require('../controllers/phoneAuthController');

// Send OTP to phone number
router.post('/send-otp', sendOTP);

// Verify OTP
router.post('/verify-otp', verifyOTP);

module.exports = router;
