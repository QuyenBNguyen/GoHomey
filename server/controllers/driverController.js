const Driver = require("../models/user");
const UserDetail = require("../models/userDetail");
const Vehicle = require("../models/vehicle");
const Ride = require("../models/ride");
const Rating = require("../models/rating"); // make sure you have a Rating model

exports.getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({ role: "Driver" });
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: "Error fetching drivers", error: err.message });
    }
};

exports.banDriver = async (req, res) => {
    try {
        const driverId = req.params.id;
        const driver = await Driver.findOneAndUpdate(
            { _id: driverId, role: "Driver" },
            { status: "Blocked" },
            { new: true }
        );
        if (!driver) return res.status(404).json({ message: "Driver not found" });
        res.json({ message: "Driver banned", driver });
    } catch (err) {
        res.status(500).json({ message: "Error banning driver", error: err.message });
    }  
};

// ---------------- Driver Profile ----------------
exports.getDriverProfile = async (req, res) => {
  try {
    const driverId = req.params.id;

    const driver = await Driver.findOne({ _id: driverId, role: "Driver" });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const details = await UserDetail.findOne({ userId: driver._id });
    const vehicles = await Vehicle.find({ owner: driver._id });

    // Aggregate rating
    const ratingAgg = await Rating.aggregate([
      { $match: { toUser: driver._id } },
      { $group: { _id: "$toUser", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);

    const ratingInfo = ratingAgg[0] || { avgRating: null, count: 0 };

    res.json({
      driver,
      details,
      vehicles,
      rating: ratingInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching driver profile", error: err.message });
  }
};

// ---------------- Driver Ratings (paginated) ----------------
exports.getDriverRatings = async (req, res) => {
  try {
    const driverId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const ratings = await Rating.find({ toUser: driverId })
      .populate("fromUser", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Rating.countDocuments({ toUser: driverId });

    res.json({
      page,
      limit,
      total,
      ratings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching ratings", error: err.message });
  }
};

// ---------------- Optional: Add rating for a driver ----------------
exports.addRating = async (req, res) => {
  try {
    const { toUser, rating, comment } = req.body;
    const fromUser = req.user.id; // from JWT

    if (!toUser || rating == null) {
      return res.status(400).json({ message: "Driver and rating required" });
    }

    const newRating = await Rating.create({
      toUser,
      fromUser,
      rating,
      comment: comment || "",
    });

    res.status(201).json({ message: "Rating added", rating: newRating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding rating", error: err.message });
  }
};

// Update driver profile (name, dob, etc.)
exports.updateDriverProfile = async (req, res) => {
  try {
    const driverId = req.params.id;
    const driver = await Driver.findOneAndUpdate(
      { _id: driverId, role: "Driver" },
      req.body,
      { new: true }
    );
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    res.json(driver);
  } catch (err) {
    res.status(400).json({ message: "Error updating profile", error: err.message });
  }
};

// ---------------- Vehicle Management ----------------

// Add or update a vehicle for driver
exports.addOrUpdateVehicle = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { type, color, license, plate } = req.body;

    let vehicle = await Vehicle.findOne({ owner: driverId, plate });
    if (vehicle) {
      // Update existing
      vehicle.type = type || vehicle.type;
      vehicle.color = color || vehicle.color;
      vehicle.license = license || vehicle.license;
      await vehicle.save();
    } else {
      // Add new
      vehicle = await Vehicle.create({
        owner: driverId,
        type,
        color,
        license,
        plate,
      });
    }

    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ message: "Error saving vehicle", error: err.message });
  }
};

// List driver vehicles
exports.getDriverVehicles = async (req, res) => {
  try {
    const driverId = req.params.id;
    const vehicles = await Vehicle.find({ owner: driverId });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vehicles", error: err.message });
  }
};

// ---------------- Ride History ----------------

// List all rides for driver
exports.getDriverRides = async (req, res) => {
  try {
    const driverId = req.params.id;
    const rides = await Ride.find({ driverId }).sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: "Error fetching rides", error: err.message });
  }
};

// ---------------- Availability ----------------

// Update driver availability (online/offline)
exports.updateAvailability = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { status } = req.body; // "Active" or "Inactive"

    const driver = await Driver.findOneAndUpdate(
      { _id: driverId, role: "Driver" },
      { status },
      { new: true }
    );
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    res.json({ message: "Status updated", driver });
  } catch (err) {
    res.status(400).json({ message: "Error updating status", error: err.message });
  }
};
