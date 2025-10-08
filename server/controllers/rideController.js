const Ride = require("../models/ride");
const RideDetail = require("../models/rideDetail");
const Driver = require("../models/user"); // assuming User has role=Driver
const { getRouteInfo } = require("../config/mapService"); // Mapbox/Google directions util

// 📌 Create Ride Request
exports.createRide = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleTypeId } = req.body;

    const vehicleType = await VehicleType.findById(vehicleTypeId);
    if (!vehicleType) return res.status(400).json({ message: "Invalid vehicle type" });

    // validate with ORS
    const route = await getRouteInfo(pickup, dropoff);

    const price =
      vehicleType.baseFare +
      route.distance * vehicleType.pricePerKm +
      route.duration * (vehicleType.pricePerMinute || 0);

    const ride = await Ride.create({
      customerId: req.user._id,
      vehicleTypeId,
      distance: route.distance,
      duration: route.duration,
      price,
    });

    await RideDetail.create({
      rideId: ride._id,
      pickup,
      dropoff,
      route: route.route,
    });

    res.json({ ride, price, route });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating ride" });
  }
};
// 📌 Get Ride by ID
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("customerId", "firstName lastName")
      .populate("driverId", "firstName lastName")
      .populate("vehicleId")
      .populate("vehicleTypeId");

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const details = await RideDetail.findOne({ rideId: ride._id });

    res.json({ ride, details });
  } catch (err) {
    res.status(500).json({ message: "Error fetching ride", error: err.message });
  }
};

// 📌 Update Ride Status
exports.updateRideStatus = async (req, res) => {
  try {
    const { status, driverId, vehicleId } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (status) ride.status = status;
    if (driverId) ride.driverId = driverId;
    if (vehicleId) ride.vehicleId = vehicleId;

    await ride.save();
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: "Error updating ride", error: err.message });
  }
};

// 📌 Delete Ride (rarely used)
exports.deleteRide = async (req, res) => {
  try {
    await Ride.findByIdAndDelete(req.params.id);
    await RideDetail.deleteOne({ rideId: req.params.id });
    res.json({ message: "Ride deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting ride", error: err.message });
  }
};

// 📌 Find Nearby Drivers (for matching)
exports.findNearbyDrivers = async (req, res) => {
  try {
    const { pickup } = req.body;

    const drivers = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
          distanceField: "distance",
          spherical: true,
          maxDistance: 5000 // 5 km radius
        }
      },
      { $match: { role: "Driver" } }
    ]);

    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: "Error finding drivers", error: err.message });
  }
};

// 📌 Track Driver (poll driver location)
exports.trackDriver = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate("driverId");
    if (!ride || !ride.driverId) return res.status(404).json({ message: "Driver not assigned" });

    // Assuming driver has current lat/lng stored in `UserDetail`
    const detail = await require("../models/userDetail").findOne({ userId: ride.driverId });
    if (!detail || !detail.location) return res.status(404).json({ message: "Driver location not found" });

    res.json({ driver: ride.driverId, location: detail.location });
  } catch (err) {
    res.status(500).json({ message: "Error tracking driver", error: err.message });
  }
};

// 📌 Track Route Home (after ride start)
exports.trackRoute = async (req, res) => {
  try {
    const details = await RideDetail.findOne({ rideId: req.params.id });
    if (!details) return res.status(404).json({ message: "Ride details not found" });

    res.json(details.route);
  } catch (err) {
    res.status(500).json({ message: "Error tracking route", error: err.message });
  }
};
