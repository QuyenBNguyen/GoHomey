const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const UserDetail = require("../models/userDetail");
const bcrypt = require("bcrypt");

// Temporary store for OTPs (better: Redis or DB)
let otpStore = {};

// Email providers
const RESEND_ENABLED = !!process.env.RESEND_API_KEY;
// Email transport enabled only when SMTP credentials exist (fallback when RESEND not configured)
const EMAIL_ENABLED = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Configure nodemailer (explicit SMTP + timeouts) only if enabled
let transporter;
if (EMAIL_ENABLED && !RESEND_ENABLED) {
  // Only initialize SMTP transport when RESEND is not enabled to avoid outbound SMTP on PaaS
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // prevent very long hangs
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    tls: {
      // In local dev, you might disable strict cert checks
      rejectUnauthorized: false,
    },
  });
}

// Verify SMTP transporter once at startup so misconfiguration is visible early (skip if using Resend)
if (EMAIL_ENABLED && transporter && !RESEND_ENABLED) {
  transporter.verify((err, success) => {
    if (err) {
      console.error("Nodemailer verify failed:", err.message || err);
    } else {
      console.log("Nodemailer ready to send messages");
    }
  });
} else {
  if (!RESEND_ENABLED) {
    console.log("Email transport disabled (no RESEND_API_KEY and no EMAIL_USER/PASS). OTPs will be logged to console in dev.");
  } else {
    console.log("Resend email provider enabled");
  }
}

// Generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Send OTP email with timeout and better logging
async function sendOtpEmail(email, otp) {
  const subject = "Your OTP Code";
  const text = `Hello, ${email}!\nYour OTP is ${otp}. It expires in 5 minutes.\n\n- GoHomey Team`;
  const html = `<p>Hello, ${email}!</p><p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p><p>- GoHomey Team -</p>`;

  // Prefer Resend HTTP API to avoid blocked SMTP ports on PaaS
  if (RESEND_ENABLED) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Choose a verified sender, or fallback to onboarding@resend.dev for initial testing
      const from = process.env.RESEND_FROM || (process.env.EMAIL_USER ? `GoHomey <${process.env.EMAIL_USER}>` : "onboarding@resend.dev");
      console.log(`\nSending OTP via Resend to ${email}`);
      const result = await resend.emails.send({ from, to: email, subject, text, html });
      if (result?.error) throw new Error(result.error?.message || "Resend send error");
      console.log("OTP email sent (Resend)", result?.data?.id || "");
      return { provider: "resend", id: result?.data?.id };
    } catch (err) {
      console.error("Resend send failed:", err?.message || err);
      // Fall through to SMTP or dev log
    }
  }

  // Fallback to SMTP if configured and no Resend (or Resend failed)
  if (EMAIL_ENABLED && transporter) {
    const mailOptions = {
      from: `"GoHomey" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
    };

    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutMs = 15000; // 15s
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("SMTP send timeout")), timeoutMs));
    console.log(`\nSending OTP to ${email} via SMTP (timeout ${timeoutMs}ms)`);
    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log("\nOTP email sent (SMTP):", info?.messageId || "(no messageId)");
    return { provider: "smtp", messageId: info?.messageId };
  }

  // Dev fallback
  console.log(`DEV MODE: OTP for ${email} is ${otp} (email not sent)`);
  return { dev: true };
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
    // Fire-and-forget email sending to avoid blocking client in dev
    sendOtpEmail(email, otp).catch((err) => {
      console.error("async sendOtpEmail (register) error:", err.message || err);
    });

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

    // Fire-and-forget email sending to avoid blocking client in dev
    sendOtpEmail(email, otp).then(() => {
      console.log(`\nOTP send initiated for ${email}`);
    }).catch((mailErr) => {
      console.error("\nrequestOtp: sendOtpEmail error:", mailErr.message || mailErr);
    });
    // Respond immediately so clients don't hit axios timeouts even if SMTP is slow
    return res.json({ message: "OTP generated and delivery initiated" });
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

    console.log("\nUser logged in:", user.email);
    console.log("UserID:", user._id);
    console.log("User role:", user.role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
