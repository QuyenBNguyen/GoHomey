const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Public routes
router.get("/vehicle-types", pricingController.getVehicleTypes);
router.post("/calculate", pricingController.calculateTripPrice);
router.post("/estimate", pricingController.getPriceEstimate);

// Admin routes
router.post("/vehicle-types", authMiddleware, pricingController.createOrUpdateVehicleType);

module.exports = router;