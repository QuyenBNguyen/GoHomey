const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.get("/vehicle-types", rideController.getVehicleTypes);
router.post("/estimate", rideController.getPriceEstimate);

// CRUD
router.post("/", authMiddleware, rideController.createRide);
router.get("/:id", authMiddleware, rideController.getRide);
router.put("/:id", authMiddleware, rideController.updateRideStatus);
router.delete("/:id", authMiddleware, rideController.deleteRide);

// Matching + Tracking
router.get("/:id/track-driver", authMiddleware, rideController.trackDriver);
router.get("/:id/track-route", authMiddleware, rideController.trackRoute);
// Driver accepts a ride (atomic)
router.post("/:id/accept", authMiddleware, rideController.acceptRideRequest);

// Pricing-related endpoints


module.exports = router;
