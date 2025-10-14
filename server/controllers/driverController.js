const Driver = require("../models/user");
const UserDetail = require("../models/userDetail");
const Vehicle = require("../models/vehicle");
const Ride = require("../models/ride");
const RideDetail = require("../models/rideDetail");
const Rating = require("../models/rating"); // make sure you have a Rating model

//Get all drivers (admin only)
exports.getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({ role: "Driver" });
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: "Error fetching drivers", error: err.message });
    }
};

// Ban a driver (admin only)
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

// Unban a driver (admin only)
exports.unbanDriver = async (req, res) => {
    try {
        const driverId = req.params.id;
        const driver = await Driver.findOneAndUpdate(
            { _id: driverId, role: "Driver" },
            { status: "Active" },
            { new: true }
        );
        if (!driver) return res.status(404).json({ message: "Driver not found" });
        res.json({ message: "Driver unbanned", driver });
    } catch (err) {
        res.status(500).json({ message: "Error unbanning driver", error: err.message });
    }
};

// Delete a driver (admin only)
exports.deleteDriver = async (req, res) => {
    try {
        const driverId = req.params.id;
        const driver = await Driver.findOneAndDelete({ _id: driverId, role: "Driver" });
        if (!driver) return res.status(404).json({ message: "Driver not found" });
        res.json({ message: "Driver deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting driver", error: err.message });
    }
};

// Create a new driver (admin only)
exports.createDriver = async (req, res) => {
    try {
        const { firstName, lastName, email, password, gender, dob } = req.body;
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ message: "Driver with this email already exists" });
        }
        const newDriver = new Driver({
            firstName,
            lastName,
            email,
            password,
            gender,
            dob,
            role: "Driver",
            status: "Active"
        });
        await newDriver.save();
        const userDetails = new UserDetail({ userId: newDriver._id });
        await userDetails.save();

        res.status(201).json({ message: "Driver created", driver: newDriver });
    } catch (err) {
        res.status(500).json({ message: "Error creating driver", error: err.message });
    }
};

exports.importDriversList = async (req, res) => {
  try {
    const drivers = req.body.drivers;

    // Validate and process each driver
    for (const driverData of drivers) {
      const { email } = driverData;

      // Check if driver already exists
      const existingDriver = await Driver.findOne({ email });
      if (existingDriver) {
        // Update existing driver
        await Driver.updateOne({ email }, driverData);
      } else {
        // Create new driver
        const newDriver = new Driver(driverData);
        await newDriver.save();
      }
    }

    res.status(200).json({ message: "Drivers imported successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error importing drivers", error: err.message });
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

// ---------------- Driver Daily Summary ----------------
exports.getDriverDailySummary = async (req, res) => {
  try {
    const driverId = req.params.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get today's completed rides
    const ridesToday = await Ride.find({
      driverId,
      status: "Completed",
      createdAt: { $gte: todayStart }
    });

    const totalRides = ridesToday.length;
    const totalEarnings = ridesToday.reduce((sum, ride) => sum + (ride.price || 0), 0);

    // Get driver rating
    const ratingAgg = await Rating.aggregate([
      { $match: { toUser: driverId } },
      { $group: { _id: "$toUser", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    const ratingInfo = ratingAgg[0] || { avgRating: null, count: 0 };

    res.json({
      totalRides,
      totalEarnings,
      rating: ratingInfo.avgRating,
      ratingCount: ratingInfo.count
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching daily summary", error: err.message });
  }
};

// ---------------- Upcoming Ride Requests ----------------
exports.getDriverUpcomingRequests = async (req, res) => {
  try {
    const driverId = req.params.id;
    // Only return rides that are assigned to this driver and are not completed/cancelled
    const pendingRides = await Ride.find({
      driverId,
      status: { $in: ["Requested", "Accepted", "InProgress"] }
    }).sort({ createdAt: 1 });

    // Optionally populate pickup/dropoff details
    const ridesWithDetails = await Promise.all(
      pendingRides.map(async (ride) => {
        const detail = await RideDetail.findOne({ rideId: ride._id });
        return {
          _id: ride._id,
          rider: ride.customerId,
          pickup: detail?.pickup?.address,
          dropoff: detail?.dropoff?.address,
          time: ride.createdAt,
          status: ride.status
        };
      })
    );

    res.json(ridesWithDetails);
  } catch (err) {
    res.status(500).json({ message: "Error fetching upcoming requests", error: err.message });
  }
};

exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "Invalid coordinates" });
    }
    const location = { type: "Point", coordinates: [lng, lat] };
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { location },
      { new: true }
    );
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Location updated", location });
  } catch (err) {
    res.status(500).json({ message: "Error updating location", error: err.message });
  }
};

exports.findNearbyDriversByType = async (req, res) => {
  try {
    const { lat, lng, vehicleTypeId, radiusKm } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number" || !vehicleTypeId) {
      return res.status(400).json({ message: "lat, lng, and vehicleTypeId are required" });
    }

    const maxRadiusKm = typeof radiusKm === "number" && radiusKm > 0 ? radiusKm : 5; // default 5km if not specified

    // Step 1: Find active drivers
    const activeDrivers = await Driver.find({
      role: "Driver",
      status: "Active"
    });

    // Step 2: Filter drivers who have vehicles with the required vehicleTypeId
    const driversWithVehicleType = [];
    for (const driver of activeDrivers) {
      const vehicle = await Vehicle.findOne({
        owner: driver._id,
        vehicleTypeId: vehicleTypeId,
        status: "Available",
      });
      if (vehicle) {
        driversWithVehicleType.push(driver);
      }
    }

    // Step 3: Filter by location proximity using UserDetail
    const nearbyDrivers = [];
    for (const driver of driversWithVehicleType) {
      const userDetail = await UserDetail.findOne({ userId: driver._id });
      if (userDetail && userDetail.currentLocation && userDetail.currentLocation.coordinates) {
        const [driverLng, driverLat] = userDetail.currentLocation.coordinates;
        // Haversine distance in km for better accuracy
        const toRad = (d) => (d * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(driverLat - lat);
        const dLon = toRad(driverLng - lng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat)) * Math.cos(toRad(driverLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance <= maxRadiusKm) {
          nearbyDrivers.push({
            ...driver.toObject(),
            distance,
            location: userDetail.currentLocation
          });
        }
      }
    }

    res.json(nearbyDrivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding nearby drivers", error: err.message });
  }
};

// List unassigned, nearby ride requests that match driver's vehicle types
exports.getAvailableRideRequests = async (req, res) => {
  try {
    const driverId = req.params.id;
    const queryLat = req.query.lat ? parseFloat(req.query.lat) : undefined;
    const queryLng = req.query.lng ? parseFloat(req.query.lng) : undefined;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : 5;

    // Ensure driver exists
    const driver = await Driver.findOne({ _id: driverId, role: "Driver" });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Find driver's available vehicle types
    const vehicles = await Vehicle.find({ ownerId: driverId, status: "Available" }).select("vehicleTypeId");
    const vehicleTypeIds = vehicles.map(v => v.vehicleTypeId);
    if (vehicleTypeIds.length === 0) {
      return res.json([]);
    }

    // Determine origin location for proximity (query or driver's currentLocation)
    let lat = queryLat, lng = queryLng;
    if (lat == null || lng == null) {
      const details = await UserDetail.findOne({ userId: driverId });
      if (details && details.currentLocation && Array.isArray(details.currentLocation.coordinates)) {
        const [dlng, dlat] = details.currentLocation.coordinates;
        lat = dlat; lng = dlng;
      }
    }

    const pipeline = [];
    if (lat != null && lng != null) {
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          spherical: true,
          maxDistance: radiusKm * 1000,
          key: "pickup"
        }
      });
    }

    // Join with rides and filter conditions
    pipeline.push(
      { $lookup: { from: "rides", localField: "rideId", foreignField: "_id", as: "ride" } },
      { $unwind: "$ride" },
      { $match: {
          "ride.status": "Requested",
          $or: [ { "ride.driverId": { $exists: false } }, { "ride.driverId": null } ],
          "ride.vehicleTypeId": { $in: vehicleTypeIds }
        } },
      { $sort: { createdAt: 1 } },
      { $project: {
          _id: 0,
          rideId: "$rideId",
          price: "$ride.price",
          distance: "$ride.distance",
          duration: "$ride.duration",
          status: "$ride.status",
          vehicleTypeId: "$ride.vehicleTypeId",
          pickup: { address: "$pickup.address", coordinates: "$pickup.coordinates" },
          dropoff: { address: "$dropoff.address", coordinates: "$dropoff.coordinates" },
          distanceKmFromDriver: { $cond: [ { $ifNull: ["$distanceMeters", false] }, { $divide: ["$distanceMeters", 1000] }, null ] },
          createdAt: "$ride.createdAt"
        } }
    );

    const results = await RideDetail.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching available requests", error: err.message });
  }
};