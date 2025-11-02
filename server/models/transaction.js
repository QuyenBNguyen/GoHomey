const mongoose = require("mongoose");

// Unified transaction model supporting VNPay and VietQR (bank transfer) as well as cash
const transactionSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // Business fields
    amount: { type: Number, required: true },
    currency: { type: String, default: "VND" },

    // Human details for receipt/QR context
    vehicle: { type: String },
    driverName: { type: String },
    tripLengthKm: { type: Number },

    // Method/provider
    method: {
      type: String,
      enum: ["Cash", "CreditCard", "E-Wallet", "VNPay", "VietQR"],
      default: "VietQR",
    },
    provider: {
      type: String,
      enum: ["vnpay", "vietqr", "cash", "card", "wallet"],
      default: "vietqr",
      lowercase: true,
    },

    // Status lifecycle
    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded", "Cancelled"],
      default: "Pending",
      index: true,
    },

    // Common order identifier (used by VNPay and for internal tracking)
    orderId: { type: String, index: true },

    // VietQR metadata (static QR image URL generation)
    bankBin: { type: String },
    accountNo: { type: String },
    accountName: { type: String },
    addInfo: { type: String },
    qrUrl: { type: String },

    // VNPay metadata
    vnpTransactionNo: { type: String },
    bankCode: { type: String },
    vnpResponseCode: { type: String },
    payDate: { type: Date },
    rawQuery: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
