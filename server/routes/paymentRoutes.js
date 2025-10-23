const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const payment = require("../controllers/paymentController");

// Client-initiated
router.post("/vnpay/create", authMiddleware, payment.createVnpayUrl);

// VNPay callbacks
router.get("/vnpay/return", payment.vnpayReturn);
router.get("/vnpay/ipn", payment.vnpayIpn);

// Polling status
router.get("/transactions/:orderId/status", authMiddleware, payment.getTransactionStatus);

module.exports = router;
