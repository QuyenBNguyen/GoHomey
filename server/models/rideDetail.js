const mongoose = require("mongoose");

const rideDetailSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  pickup: {
    address: String,
    lat: Number,
    lng: Number
  },
  dropoff: {
    address: String,
    lat: Number,
    lng: Number
  },
  route: [
    {
      lat: Number,
      lng: Number
    }
  ]
});

rideDetailSchema.index({ "pickup": "2dsphere" });
rideDetailSchema.index({ "dropoff": "2dsphere" });

module.exports = mongoose.model("RideDetail", rideDetailSchema);
