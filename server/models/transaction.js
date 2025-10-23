const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "VND" },
  method: { type: String, enum: ["Cash", "CreditCard", "E-Wallet", "VNPay"], default: "VNPay" },
  provider: { type: String, enum: ["vnpay", "cash", "card", "wallet"], default: "vnpay" },
  status: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
  // VNPay specific fields
  orderId: { type: String, index: true }, // vnp_TxnRef
  vnpTransactionNo: { type: String }, // vnp_TransactionNo
  bankCode: { type: String },
  vnpResponseCode: { type: String },
  payDate: { type: Date },
  rawQuery: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
