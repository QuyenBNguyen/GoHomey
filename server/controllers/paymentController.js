const crypto = require("crypto");
const Transaction = require("../models/transaction");
const Ride = require("../models/ride");
const User = require("../models/user");

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

function hmacSHA512(secret, data) {
  return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");
}

function formatDateVN(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

exports.createVnpayUrl = async (req, res) => {
  try {
    const userId = req.user.id; // auth required
    const { rideId } = req.body;
    if (!rideId) return res.status(400).json({ message: "rideId required" });
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const amountVnd = Math.round(ride.price || 0);
    const orderId = `${rideId}-${Date.now()}`;

    // Create pending transaction
    await Transaction.create({
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: ride.driverId,
      amount: amountVnd,
      method: "VNPay",
      provider: "vnpay",
      status: "Pending",
      orderId,
    });

    const vnp_TmnCode = process.env.VNP_TMNCODE;
    const vnp_HashSecret = process.env.VNP_HASHSECRET;
    const vnp_ReturnUrl = process.env.VNP_RETURNURL; // e.g., https://your.host/payments/vnpay/return
    const vnp_IpnUrl = process.env.VNP_IPNURL; // e.g., https://your.host/payments/vnpay/ipn
    const baseUrl = process.env.VNP_BASEURL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "127.0.0.1";

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Amount: amountVnd * 100,
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Pay for ride ${ride._id}`,
      vnp_OrderType: "250000",
      vnp_Locale: "vn",
      vnp_ReturnUrl,
      vnp_IpAddr: clientIp,
      vnp_CreateDate: formatDateVN(),
    };

    const sorted = sortObject(params);
    const query = new URLSearchParams(sorted).toString();
    const vnp_SecureHash = hmacSHA512(vnp_HashSecret, query);
    const url = `${baseUrl}?${query}&vnp_SecureHash=${vnp_SecureHash}`;

    return res.json({ url, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create VNPay URL" });
  }
};

function verifyReturn(query, secret) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  const sorted = sortObject(rest);
  const str = new URLSearchParams(sorted).toString();
  const check = hmacSHA512(secret, str);
  return (vnp_SecureHash || "").toLowerCase() === check.toLowerCase();
}

async function updateTransactionFromVN(query, status) {
  const orderId = query.vnp_TxnRef;
  const tx = await Transaction.findOne({ orderId });
  if (!tx) return null;
  tx.status = status;
  tx.vnpTransactionNo = query.vnp_TransactionNo;
  tx.bankCode = query.vnp_BankCode;
  tx.vnpResponseCode = query.vnp_ResponseCode;
  tx.rawQuery = query;
  if (query.vnp_PayDate) {
    // yyyymmddHHMMss
    const d = query.vnp_PayDate;
    const iso = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}Z`;
    tx.payDate = new Date(iso);
  }
  await tx.save();
  return tx;
}

exports.vnpayReturn = async (req, res) => {
  try {
    const ok = verifyReturn(req.query, process.env.VNP_HASHSECRET);
    const code = req.query.vnp_ResponseCode;
    const status = ok && code === "00" ? "Paid" : "Failed";
    await updateTransactionFromVN(req.query, status);
    // Show a simple JSON; production would render a page
    return res.json({ valid: ok, code, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing return" });
  }
};

exports.vnpayIpn = async (req, res) => {
  try {
    const ok = verifyReturn(req.query, process.env.VNP_HASHSECRET);
    const code = req.query.vnp_ResponseCode;
    const status = ok && code === "00" ? "Paid" : "Failed";
    const tx = await updateTransactionFromVN(req.query, status);
    if (tx && status === "Paid") {
      await Ride.findByIdAndUpdate(tx.rideId, { status: "Completed" });
    }
    return res.status(200).json({ RspCode: "00", Message: "OK" });
  } catch (err) {
    console.error(err);
    res.status(200).json({ RspCode: "99", Message: "Error" });
  }
};

exports.getTransactionStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const tx = await Transaction.findOne({ orderId });
    if (!tx) return res.status(404).json({ message: "Not found" });
    res.json({ status: tx.status, tx });
  } catch (err) {
    res.status(500).json({ message: "Error fetching status" });
  }
};

// ============ VietQR ============
// We use https://img.vietqr.io to render a static QR image without API keys.
// Configure your bank and account via environment variables.
// Required env:
//  - VIETQR_BANK_BIN (e.g., 970415 for TPBank)
//  - VIETQR_ACCOUNT_NO (destination account number)
//  - VIETQR_ACCOUNT_NAME (account holder for display)
//  - VIETQR_TEMPLATE (optional: "qr_only" | "compact2" | "compact" | default "qr_only")

function buildVietQrUrl({ bankBin, accountNo, amount, addInfo, accountName, template = "qr_only" }) {
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNo}-${template}.png`;
  const params = new URLSearchParams();
  if (amount && amount > 0) params.set("amount", String(Math.round(amount)));
  if (addInfo) params.set("addInfo", addInfo);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
}

exports.createVietqr = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rideId } = req.body || {};
    if (!rideId) return res.status(400).json({ message: "rideId required" });

    const ride = await Ride.findById(rideId).populate("vehicleTypeId");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Derive info strings
    const driver = ride.driverId ? await User.findById(ride.driverId) : null;
    const driverName = driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() : "";
    const vehicle = ride.vehicleTypeId ? ride.vehicleTypeId.type || ride.vehicleTypeId.name || "Vehicle" : "Vehicle";
    const amountVnd = Math.max(0, Math.round(ride.price || 0));
    const tripLengthKm = typeof ride.distance === "number" ? ride.distance : undefined;

    // Build addInfo for bank statement (keep concise and ASCII)
    const shortRideId = String(rideId).slice(-6);
    const addInfo = `GoHomey ${shortRideId}`; // Keep it short to fit bank limits

    const bankBin = process.env.VIETQR_BANK_BIN;
    const accountNo = process.env.VIETQR_ACCOUNT_NO;
    const accountName = process.env.VIETQR_ACCOUNT_NAME;
    const template = process.env.VIETQR_TEMPLATE || "qr_only";

    if (!bankBin || !accountNo || !accountName) {
      return res.status(500).json({
        message: "VietQR not configured. Please set VIETQR_BANK_BIN, VIETQR_ACCOUNT_NO, VIETQR_ACCOUNT_NAME",
      });
    }

    const qrUrl = buildVietQrUrl({ bankBin, accountNo, amount: amountVnd, addInfo, accountName, template });

    const orderId = `${rideId}-${Date.now()}`;
    const tx = await Transaction.create({
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: ride.driverId,
      amount: amountVnd,
      currency: "VND",
      method: "VietQR",
      provider: "vietqr",
      status: "Pending",
      orderId,
      bankBin,
      accountNo,
      accountName,
      addInfo,
      qrUrl,
      vehicle,
      driverName,
      tripLengthKm,
    });

    res.status(201).json({
      transactionId: tx._id,
      orderId,
      amount: amountVnd,
      currency: "VND",
      qrUrl,
      meta: { vehicle, driverName, tripLengthKm, addInfo, bankBin, accountNo, accountName },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create VietQR" });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: "Not found" });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};

async function completeRideIfNeeded(tx) {
  if (tx && String(tx.status) === "Paid" && tx.rideId) {
    await Ride.findByIdAndUpdate(tx.rideId, { status: "Completed" });
  }
}

exports.markPaidCash = async (req, res) => {
  try {
    const { id } = req.params; // transaction id
    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    tx.method = "Cash";
    tx.provider = "cash";
    tx.status = "Paid";
    await tx.save();
    await completeRideIfNeeded(tx);
    res.json({ message: "Marked as paid (cash)", tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark cash" });
  }
};

exports.markPaidTransfer = async (req, res) => {
  try {
    const { id } = req.params; // transaction id
    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    // Note: In real systems, verify bank statement/amount before marking paid
    tx.status = "Paid";
    await tx.save();
    await completeRideIfNeeded(tx);
    res.json({ message: "Marked as paid (transfer)", tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark transfer" });
  }
};
