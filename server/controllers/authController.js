const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const UserDetail = require("../models/userDetail");
const bcrypt = require("bcrypt");

// Temporary store for OTPs (better: Redis or DB)
let otpStore = {};

// Configure nodemailer (explicit SMTP + timeouts)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // prevent very long hangs
  connectionTimeout: 10000, // 10s
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    // set to false if you have issues with certificates in dev
    rejectUnauthorized: true,
  },
});

// Verify transporter once at startup so misconfiguration is visible early
transporter.verify((err, success) => {
  if (err) {
    console.error("Nodemailer verify failed:", err.message || err);
  } else {
    console.log("Nodemailer ready to send messages");
  }
});

// Generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Send OTP email with timeout and better logging
async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: `"GoHomey" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Hello, ${email}! \n Your OTP is ${otp}. It expires in 5 minutes. \n\n - GoHomey Team`,
    html: `<p>Hello, ${email}!</p><p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p><p>- GoHomey Team -</p>`,
  };

  // small helper to avoid extremely long hangs
  const sendPromise = transporter.sendMail(mailOptions);
  const timeoutMs = 15000; // 15s
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SMTP send timeout")), timeoutMs)
  );

  console.log(`Sending OTP to ${email} (timeout ${timeoutMs}ms)`);
  try {
    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log("OTP email sent:", info?.messageId || "(no messageId)");
    return info;
  } catch (err) {
    console.error("Failed to send OTP email:", err.message || err);
    throw err;
  }
}

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, gender } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    if (phone) {
      const samePhone = await User.findOne({ phone });
      if (samePhone) return res.status(409).json({ message: "Phone number already in use" });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password, 
      phone,
      gender,
      role: "Customer",
    });
    await user.save();

    await UserDetail.create({ userId: user._id });

    // Send OTP after registration
    const otp = generateOtp();
    otpStore[email] = {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    await sendOtpEmail(email, otp);

    return res.status(201).json({ message: "Registered. OTP sent to email", email });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate field error" });
    }
    res.status(500).json({ message: "Server error" });
  }
};


exports.requestOtp = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    // basic password length checks (if provided)
    if (password && password.length < 6)
      return res.status(400).json({ message: "Password too short" });
    if (password && password.length > 100)
      return res.status(400).json({ message: "Password too long" });

    const user = await User.findOne({ email });

    // If user not found, inform client to register
    if (!user) return res.status(404).json({ message: "User not found. Please register." });

    // If user has a password, require it and verify
    if (user.password) {
      if (!password) return res.status(401).json({ message: "Password required for this account" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: "Invalid password" });
    }

    // Generate and store OTP
    const otp = generateOtp();
    otpStore[email] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

    try {
      await sendOtpEmail(email, otp);
      return res.json({ message: "OTP sent to email" });
    } catch (mailErr) {
      console.error("requestOtp: sendOtpEmail error:", mailErr.message || mailErr);
      return res.status(502).json({ message: "Failed to send OTP email. Try again later." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

    const record = otpStore[email];
    if (!record || record.code !== otp || record.expires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // consume OTP
    delete otpStore[email];

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure user detail exists (atomic upsert)
    const detail = await UserDetail.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { new: true, upsert: true }
    );

    // issue JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });

    console.log("User logged in:", user.email);
    console.log("UserID:", user._id);
    console.log("User role:", user.role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
