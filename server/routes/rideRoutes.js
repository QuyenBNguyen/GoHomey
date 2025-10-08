const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// CRUD
router.post("/", authMiddleware, rideController.createRide);
router.get("/:id", authMiddleware, rideController.getRide);
router.put("/:id", authMiddleware, rideController.updateRideStatus);
router.delete("/:id", authMiddleware, rideController.deleteRide);

// Matching + Tracking
router.post("/find-drivers", authMiddleware, rideController.findNearbyDrivers);
router.get("/:id/track-driver", authMiddleware, rideController.trackDriver);
router.get("/:id/track-route", authMiddleware, rideController.trackRoute);

module.exports = router;
