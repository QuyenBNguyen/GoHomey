const crypto = require("crypto");
const Transaction = require("../models/transaction");
const Ride = require("../models/ride");

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
