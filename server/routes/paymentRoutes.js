const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const permitRoles = require("../middlewares/roleMiddleware");
const payment = require("../controllers/paymentController");

// Client-initiated
router.post("/vnpay/create", authMiddleware, payment.createVnpayUrl);

// VNPay callbacks
router.get("/vnpay/return", payment.vnpayReturn);
router.get("/vnpay/ipn", payment.vnpayIpn);

// Polling status
router.get("/transactions/:orderId/status", authMiddleware, payment.getTransactionStatus);

// VietQR
router.post(
	"/vietqr/create",
	authMiddleware,
	// Only driver (or admin) should initiate QR at trip end
	(req, res, next) => permitRoles("Driver", "Admin")(req, res, next),
	payment.createVietqr
);

router.get(
	"/transactions/:id",
	authMiddleware,
	payment.getTransactionById
);

router.post(
	"/transactions/:id/paid-cash",
	authMiddleware,
	(req, res, next) => permitRoles("Driver", "Admin")(req, res, next),
	payment.markPaidCash
);

router.post(
	"/transactions/:id/paid-transfer",
	authMiddleware,
	(req, res, next) => permitRoles("Driver", "Admin")(req, res, next),
	payment.markPaidTransfer
);

module.exports = router;
