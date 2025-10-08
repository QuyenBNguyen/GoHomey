const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  method: { type: String, enum: ["Cash", "CreditCard", "E-Wallet"] },
  status: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
