const VehicleType = require("../models/vehicleType");
const { getRouteInfo } = require("../config/mapService");

// Get all vehicle types
exports.getVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find({});
    res.json(vehicleTypes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vehicle types", error: err.message });
  }
};

// Calculate trip price based on distance and duration
exports.calculateTripPrice = async (req, res) => {
  try {
    const { distance, duration, vehicleTypeId } = req.body;

    if (!distance || !duration) {
      return res.status(400).json({ message: "Distance and duration are required" });
    }

    let vehicleTypes;
    if (vehicleTypeId) {
      const vehicleType = await VehicleType.findById(vehicleTypeId);
      if (!vehicleType) {
        return res.status(404).json({ message: "Vehicle type not found" });
      }
      vehicleTypes = [vehicleType];
    } else {
      vehicleTypes = await VehicleType.find({});
    }

    const calculations = vehicleTypes.map(vehicleType => {
      const baseFare = vehicleType.baseFare;
      const distanceCost = distance * vehicleType.pricePerKm;
      const timeCost = duration * (vehicleType.pricePerMinute || 0);
      const subtotal = baseFare + distanceCost + timeCost;
      const totalPrice = Math.round(subtotal * vehicleType.surgeMultiplier);

      return {
        vehicleType,
        totalPrice,
        breakdown: {
          baseFare,
          distanceCost: Math.round(distanceCost),
          timeCost: Math.round(timeCost),
          surgeMultiplier: vehicleType.surgeMultiplier
        }
      };
    });

    res.json(calculations);
  } catch (err) {
    res.status(500).json({ message: "Error calculating trip price", error: err.message });
  }
};

// Get price estimate for a route (with automatic distance/duration calculation)
exports.getPriceEstimate = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    if (!pickup || !dropoff || !pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
      return res.status(400).json({ message: "Valid pickup and dropoff coordinates are required" });
    }

    // Calculate route using map service
    const route = await getRouteInfo(pickup, dropoff);
    
    // Get all vehicle types
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
  } catch (err) {
    res.status(500).json({ message: "Error getting price estimate", error: err.message });
  }
};

// Create or update vehicle type (admin only)
exports.createOrUpdateVehicleType = async (req, res) => {
  try {
    const { type, baseFare, pricePerKm, pricePerMinute, surgeMultiplier } = req.body;

    if (!type || !baseFare || !pricePerKm) {
      return res.status(400).json({ message: "Type, baseFare, and pricePerKm are required" });
    }

    const vehicleType = await VehicleType.findOneAndUpdate(
      { type },
      {
        type,
        baseFare,
        pricePerKm,
        pricePerMinute: pricePerMinute || 0,
        surgeMultiplier: surgeMultiplier || 1.0
      },
      { upsert: true, new: true }
    );

    res.json(vehicleType);
  } catch (err) {
    res.status(500).json({ message: "Error creating/updating vehicle type", error: err.message });
  }
};