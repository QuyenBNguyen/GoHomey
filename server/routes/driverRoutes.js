// Find nearby drivers with same vehicle type
const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../middlewares/authMiddleware");
const permitRoles = require("../middlewares/roleMiddleware");

const driverController = require("../controllers/driverController");

// All routes require JWT
router.use(authMiddleware);

router.post("/nearby", driverController.findNearbyDriversByType);
// Only Admin or the driver themselves can view/update driver profile
router.get("/:id",  driverController.getDriverProfile);
router.put("/:id",  driverController.updateDriverProfile);
router.get("/",  driverController.getAllDrivers);
router.post("/:id", driverController.banDriver);
router.post("/unban/:id", driverController.unbanDriver);
router.delete("/:id", driverController.deleteDriver);
router.post("/", driverController.createDriver);

// Vehicle management (driver only)
router.post("/:id/vehicle", driverController.addOrUpdateVehicle);
router.get("/:id/vehicles",  driverController.getDriverVehicles);

// Ride history (driver themselves or admin)
router.get("/:id/rides", driverController.getDriverRides);

// Update availability (driver only)
router.put("/:id/status",  driverController.updateAvailability);

// Get driver ratings (driver themselves or admin)
router.get("/:id/ratings",  driverController.getDriverRatings);
//router.post("/:id/ratings", driverController.addDriverRating);

router.get("/:id/daily-summary", driverController.getDriverDailySummary);
router.get("/:id/upcoming-requests", driverController.getDriverUpcomingRequests);
router.put("/:id/location", driverController.updateDriverLocation);

// Available unassigned ride requests for this driver (nearby + matching vehicle type)
router.get("/:id/available-requests", driverController.getAvailableRideRequests);

module.exports = router;
