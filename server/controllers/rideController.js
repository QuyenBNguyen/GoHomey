const Ride = require("../models/ride");
const RideDetail = require("../models/rideDetail");
const Driver = require("../models/user"); // assuming User has role=Driver
const VehicleType = require("../models/vehicleType");
const { getRouteInfo } = require("../config/mapService"); // Mapbox/Google directions util
// 📌 Get all vehicle types
exports.getVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find({});
    res.json(vehicleTypes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vehicle types", error: err.message });
  }
};

// 📌 Calculate trip price for a route (estimate)
exports.getPriceEstimate = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;
    console.log("\nEstimate request body:", req.body);
    console.log("\nPickup: ", pickup);
    console.log("\nDropoff: ", dropoff);
    if (!pickup || !dropoff || !pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
      return res.status(400).json({ message: "Valid pickup and dropoff coordinates are required" });
    }
    const route = await getRouteInfo(pickup, dropoff);
    const vehicleTypes = await VehicleType.find({});
    const calculations = vehicleTypes.map(vehicleType => {
      const baseFare = vehicleType.baseFare;
      const distanceCost = route.distance * vehicleType.pricePerKm;
      const timeCost = route.duration * (vehicleType.pricePerMinute || 0);
      const subtotal = baseFare + distanceCost + timeCost;
      const totalPrice = Math.round(subtotal * vehicleType.surgeMultiplier);
      return {
        vehicleType,
        totalPrice,
        route: {
          distance: route.distance,
          duration: route.duration
        },
        breakdown: {
          baseFare,
          distanceCost: Math.round(distanceCost),
          timeCost: Math.round(timeCost),
          surgeMultiplier: vehicleType.surgeMultiplier
        }
      };
    });
    res.json(calculations);
    console.log(calculations);
  } catch (err) {
    res.status(500).json({ message: "Error getting price estimate", error: err.message });
  }
};

// 📌 Create Ride Request
exports.createRide = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleTypeId } = req.body;

    const vehicleType = await VehicleType.findById(vehicleTypeId);
    if (!vehicleType) return res.status(400).json({ message: "Invalid vehicle type" });

    // validate with ORS
    const route = await getRouteInfo(pickup, dropoff);

    const subtotal = vehicleType.baseFare + route.distance * vehicleType.pricePerKm + route.duration * (vehicleType.pricePerMinute || 0);
    const price = Math.round(subtotal * vehicleType.surgeMultiplier);

    const ride = await Ride.create({
      customerId: req.user._id,
      vehicleTypeId,
      distance: route.distance,
      duration: route.duration,
      price,
    });

    // Convert pickup/dropoff to GeoJSON format for RideDetail
    const pickupGeo = {
      type: "Point",
      coordinates: [pickup.lng, pickup.lat],
      address: pickup.address || ""
    };
    const dropoffGeo = {
      type: "Point",
      coordinates: [dropoff.lng, dropoff.lat],
      address: dropoff.address || ""
    };

    await RideDetail.create({
      rideId: ride._id,
      pickup: pickupGeo,
      dropoff: dropoffGeo,
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

// 📌 Track Driver (poll driver location)
exports.trackDriver = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate("driverId");
    if (!ride || !ride.driverId) return res.status(404).json({ message: "Driver not assigned" });

    // Assuming driver has current lat/lng stored in `UserDetail`
    const detail = await require("../models/userDetail").findOne({ userId: ride.driverId });
    if (!detail || !detail.currentLocation) return res.status(404).json({ message: "Driver location not found" });

    res.json({ driver: ride.driverId, location: detail.currentLocation });
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

// 📌 Accept a ride request (atomic claim)
exports.acceptRideRequest = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { driverId, vehicleId } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    const filter = {
      _id: rideId,
      status: "Requested",
      $or: [ { driverId: { $exists: false } }, { driverId: null } ]
    };
    const update = {
      $set: { status: "Accepted", driverId, ...(vehicleId ? { vehicleId } : {}) }
    };

    const updated = await Ride.findOneAndUpdate(filter, update, { new: true });
    if (!updated) {
      return res.status(409).json({ message: "Ride already accepted or not available" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error accepting ride", error: err.message });
  }
};
