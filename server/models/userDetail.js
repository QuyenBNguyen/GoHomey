const mongoose = require("mongoose");

const userDetailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: Number,
  homeLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  emergencyContact: String
});

module.exports = mongoose.model("UserDetail", userDetailSchema);
