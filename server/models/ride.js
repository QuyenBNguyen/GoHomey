const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  vehicleTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleType" },
  distance: Number,
  duration: Number,
  price: Number,
  status: { 
    type: String, 
    enum: ["Requested", "Accepted", "InProgress", "Completed", "Cancelled"], 
    default: "Requested" 
  }
}, { timestamps: true });

// Index on status and createdAt for faster filtering of recent requested rides
rideSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Ride", rideSchema);
