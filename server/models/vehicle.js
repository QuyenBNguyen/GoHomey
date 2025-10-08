const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicleTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleType", required: true },
  color: String,
  licensePlate: { type: String, unique: true },
  model: String,
  status: { type: String, enum: ["Available", "Unavailable", "In Ride"], default: "Available" }
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
