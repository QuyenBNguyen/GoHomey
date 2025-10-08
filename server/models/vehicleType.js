const mongoose = require("mongoose");

const vehicleTypeSchema = new mongoose.Schema({
  type: { type: String, enum: ["Car", "Motorbike"], required: true },
  baseFare: { type: Number, required: true },
  pricePerKm: { type: Number, required: true },
  pricePerMinute: Number,
  surgeMultiplier: { type: Number, default: 1.0 }
}, { timestamps: true });

module.exports = mongoose.model("VehicleType", vehicleTypeSchema);
