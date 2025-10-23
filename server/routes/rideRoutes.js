const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Pricing helpers
router.get("/vehicle-types", rideController.getVehicleTypes);
router.post("/estimate", rideController.getPriceEstimate);

// Create & fetch rides (match controller names)
router.post("/", authMiddleware, rideController.createRideRequest);
router.get("/:id", authMiddleware, rideController.getRideById);

// Tracking
router.get("/:id/track-driver", authMiddleware, rideController.getDriverToCustomerRoute);
router.get("/:id/track-route", authMiddleware, rideController.trackCustomerToHome);
router.get("/:id/track-customer", authMiddleware, rideController.trackCustomerToHome);

// Accept ride (atomic)
router.post("/:id/accept", authMiddleware, rideController.acceptRideRequest);

module.exports = router;
