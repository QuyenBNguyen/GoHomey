const mongoose = require("mongoose");

const rideDetailSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  pickup: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address: String,
  },
  dropoff: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address: String,
  },
  route: [
    {
      lat: Number,
      lng: Number
    }
  ]
});

rideDetailSchema.index({ pickup: "2dsphere" });
rideDetailSchema.index({ dropoff: "2dsphere" });

module.exports = mongoose.model("RideDetail", rideDetailSchema);
