const mongoose = require("mongoose");

const userDetailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: Number,
  homeLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  currentLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  emergencyContact: String
});

// Geo index for proximity queries on current location
userDetailSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("UserDetail", userDetailSchema);
