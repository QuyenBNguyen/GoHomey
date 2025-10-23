const Ride = require("../models/ride");
const RideDetail = require("../models/rideDetail");
const UserDetail = require("../models/userDetail");
const VehicleType = require("../models/vehicleType");
const { getRouteInfo } = require("../config/mapService");

// Helpers
const ensureCoords = (p) => p && typeof p.lat === "number" && typeof p.lng === "number";
const buildPrice = (vehicleType, distance, duration) => {
  const subtotal =
    (vehicleType.baseFare || 0) +
    distance * (vehicleType.pricePerKm || 0) +
    duration * (vehicleType.pricePerMinute || 0);
  return Math.round(subtotal * (vehicleType.surgeMultiplier || 1));
};

// List vehicle types
exports.getVehicleTypes = async (_req, res) => {
  try {
    const items = await VehicleType.find().sort({ type: 1 }).lean();
    res.json(items);
  } catch (err) {
    console.error("[getVehicleTypes]", err);
    res.status(500).json({ message: "Error fetching vehicle types", error: err.message });
  }
};

// Calculate price estimate for all vehicle types
exports.getPriceEstimate = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body || {};
    if (!ensureCoords(pickup) || !ensureCoords(dropoff)) {
      return res.status(400).json({ message: "Valid pickup and dropoff coordinates are required" });
    }

    const route = await getRouteInfo(pickup, dropoff); // { distance (km), duration (min), route: polyline[] }
    const vehicles = await VehicleType.find().lean();

    const results = vehicles.map((vt) => {
      const baseFare = vt.baseFare || 0;
      const distanceCost = route.distance * (vt.pricePerKm || 0);
      const timeCost = route.duration * (vt.pricePerMinute || 0);
      const totalPrice = Math.round((baseFare + distanceCost + timeCost) * (vt.surgeMultiplier || 1));
      return {
        vehicleType: vt,
        totalPrice,
        route: { distance: route.distance, duration: route.duration },
        breakdown: {
          baseFare,
          distanceCost,
          timeCost,
          surgeMultiplier: vt.surgeMultiplier || 1,
        },
      };
    });

    res.json(results);
  } catch (err) {
    console.error("[getPriceEstimate]", err);
    res.status(500).json({ message: "Error estimating price", error: err.message });
  }
};
// Accept a ride request (atomic)
exports.acceptRideRequest = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { driverId, vehicleId } = req.body || {};
    if (!driverId) return res.status(400).json({ message: "driverId required" });

    // Only accept if still Requested and unassigned
    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: "Requested", $or: [ { driverId: { $exists: false } }, { driverId: null } ] },
      { $set: { driverId, status: "Accepted", ...(vehicleId ? { vehicleId } : {}) } },
      { new: true }
    );

    if (!ride) {
      return res.status(409).json({ message: "Ride already accepted by another driver or not in Requested state" });
    }

    return res.json({ message: "Ride accepted", ride });
  } catch (err) {
    console.error("[acceptRideRequest]", err);
    res.status(500).json({ message: "Error accepting ride", error: err.message });
  }
};

// 1) Create ride request
exports.createRideRequest = async (req, res) => {
  try {
  const { pickup, dropoff, vehicleTypeId } = req.body;
  // authMiddleware puts { id, role, email } on req.user
  const customerId = req.user?.id || req.user?._id || req.body.customerId;

    if (!customerId) return res.status(400).json({ message: "customerId missing" });
    if (!vehicleTypeId) return res.status(400).json({ message: "vehicleTypeId missing" });
    if (!ensureCoords(pickup) || !ensureCoords(dropoff)) {
      return res.status(400).json({ message: "Valid pickup and dropoff coordinates are required" });
    }

    const vehicleType = await VehicleType.findById(vehicleTypeId);
    if (!vehicleType) return res.status(400).json({ message: "Invalid vehicle type" });

    const route = await getRouteInfo(pickup, dropoff); // { distance, duration, route }
    const price = buildPrice(vehicleType, route.distance, route.duration);

    const ride = await Ride.create({
      customerId,
      vehicleTypeId,
      status: "Requested",
      distance: route.distance,
      duration: route.duration,
      price,
    });

    await RideDetail.create({
      rideId: ride._id,
      pickup: {
        type: "Point",
        coordinates: [pickup.lng, pickup.lat],
        address: pickup.address || "",
      },
      dropoff: {
        type: "Point",
        coordinates: [dropoff.lng, dropoff.lat],
        address: dropoff.address || "",
      },
      route: route.route,
    });

    res.status(201).json({ ride, route, price });
  } catch (err) {
    console.error("[createRideRequest]", err);
    res.status(500).json({ message: "Error creating ride request", error: err.message });
  }
};

// 2) Get all rides (with filters + pagination)
exports.getAllRides = async (req, res) => {
  try {
    const {
      status,
      customerId,
      driverId,
      vehicleTypeId,
      from,
      to,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const q = {};
    if (status) q.status = status;
    if (customerId) q.customerId = customerId;
    if (driverId) q.driverId = driverId;
    if (vehicleTypeId) q.vehicleTypeId = vehicleTypeId;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Ride.find(q)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "firstName lastName")
        .populate("driverId", "firstName lastName")
        .populate("vehicleTypeId"),
      Ride.countDocuments(q),
    ]);

    res.json({
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[getAllRides]", err);
    res.status(500).json({ message: "Error fetching rides", error: err.message });
  }
};

// 3) Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("customerId", "firstName lastName phone gender")
      .populate("driverId", "firstName lastName phone gender")
      .populate("vehicleTypeId");

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const details = await RideDetail.findOne({ rideId: ride._id });
    res.json({ ride, details });
  } catch (err) {
    console.error("[getRideById]", err);
    res.status(500).json({ message: "Error fetching ride", error: err.message });
  }
};

// 4) Get rides by userId (as customer or driver)
exports.getRidesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role = "all", page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const or = [];
    if (role === "customer" || role === "all") or.push({ customerId: userId });
    if (role === "driver" || role === "all") or.push({ driverId: userId });
    if (!or.length) return res.status(400).json({ message: "Invalid role filter" });

    const q = { $or: or };

    const [items, total] = await Promise.all([
      Ride.find(q)
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .populate("vehicleTypeId"),
      Ride.countDocuments(q),
    ]);

    res.json({
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[getRidesByUserId]", err);
    res.status(500).json({ message: "Error fetching rides for user", error: err.message });
  }
};

// 5) Calculate route from driver to customer (poll for live tracking)
exports.getDriverToCustomerRoute = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { driverId: driverIdFromQuery } = req.query;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const details = await RideDetail.findOne({ rideId: ride._id });
    if (!details?.pickup?.coordinates) {
      return res.status(404).json({ message: "Pickup location not found" });
    }

    const driverId = ride.driverId || driverIdFromQuery;
    if (!driverId) return res.status(400).json({ message: "driverId not assigned or provided" });

    const driverDetail = await UserDetail.findOne({ userId: driverId });
    if (!driverDetail?.currentLocation?.coordinates) {
      return res.status(404).json({ message: "Driver live location not found" });
    }

    const [drvLng, drvLat] = driverDetail.currentLocation.coordinates;
    const [pickLng, pickLat] = details.pickup.coordinates;

    const route = await getRouteInfo({ lat: drvLat, lng: drvLng }, { lat: pickLat, lng: pickLng });

    res.json({
      driverId,
      driverLocation: driverDetail.currentLocation,
      toPickup: route,
      updatedAt: driverDetail.updatedAt || new Date(),
    });
  } catch (err) {
    console.error("[getDriverToCustomerRoute]", err);
    res.status(500).json({ message: "Error computing driver route", error: err.message });
  }
};

// 6) Live track customer to customer's home (dropoff)
exports.trackCustomerToHome = async (req, res) => {
  try {
    const rideId = req.params.id;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const details = await RideDetail.findOne({ rideId: ride._id });
    if (!details?.dropoff?.coordinates) {
      return res.status(404).json({ message: "Dropoff location not found" });
    }

    const customerDetail = await UserDetail.findOne({ userId: ride.customerId });
    if (!customerDetail?.currentLocation?.coordinates) {
      return res.status(404).json({ message: "Customer live location not found" });
    }

    const [custLng, custLat] = customerDetail.currentLocation.coordinates;
    const [dropLng, dropLat] = details.dropoff.coordinates;

    const route = await getRouteInfo({ lat: custLat, lng: custLng }, { lat: dropLat, lng: dropLng });

    // Back-compat: keep toHome object, but also expose flat fields expected by some clients
    res.json({
      customerId: ride.customerId,
      customerLocation: customerDetail.currentLocation,
      toHome: route,
      // flat fields for clients expecting { route, distance, duration }
      route: route.route,
      distance: route.distance,
      duration: route.duration,
      updatedAt: customerDetail.updatedAt || new Date(),
    });
  } catch (err) {
    console.error("[trackCustomerToHome]", err);
    res.status(500).json({ message: "Error computing customer route", error: err.message });
  }
};
