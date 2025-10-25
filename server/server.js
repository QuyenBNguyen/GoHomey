require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const userRoutes = require("./routes/userRoutes");
const driverRoutes = require("./routes/driverRoutes");
const phoneAuthRoutes = require("./routes/phoneAuthRoutes");
const userDetailRoutes = require("./routes/userDetailRoutes");
const paymentRoutes = require("./routes/paymentRoutes");


const app = express();

// Trust proxy headers (important on Render/NGINX to detect HTTPS correctly)
app.set('trust proxy', true);

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Lightweight log for diagnostics routes only when enabled
const LOG_PING = (process.env.LOG_PING || '').toLowerCase() === 'true';
function diagLog(label, payload) {
  if (LOG_PING) {
    try {
      console.log(`[diag:${label}]`, JSON.stringify(payload));
    } catch (e) {
      console.log(`[diag:${label}]`, payload);
    }
  }
}

// MongoDB connection (optional for phone auth)
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
} else {
  console.log("MongoDB not configured - phone auth will work without it");
}

app.use("/auth", authRoutes);
app.use("/auth", phoneAuthRoutes);
app.use("/rides", rideRoutes);
app.use("/users", userRoutes);
app.use("/drivers", driverRoutes);
app.use("/user-details", userDetailRoutes);
app.use("/payments", paymentRoutes);
// Pricing routes removed, now handled in /rides

app.get("/", (req, res) => res.send("API Running"));

// Health check: fast, cache-safe, CORS-friendly
app.get('/ping', (req, res) => {
  const { version } = require('./package.json');
  const body = {
    ok: true,
    name: 'GoHomey API',
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    version,
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  };
  diagLog('ping', {
    proto: req.protocol,
    secure: req.secure,
    host: req.headers['host'],
    xfProto: req.headers['x-forwarded-proto'],
    ip: req.ip,
    ips: req.ips,
    path: req.originalUrl,
  });
  res.set('Cache-Control', 'no-store');
  res.json(body);
});

// HEAD /ping for lightweight checks
app.head('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendStatus(200);
});

// Diagnostic echo (no sensitive data). Do NOT expose secrets.
app.get('/_diag/echo', (req, res) => {
  const data = {
    method: req.method,
    url: req.originalUrl,
    protocol: req.protocol,
    secure: req.secure,
    headers: {
      host: req.headers['host'],
      origin: req.headers['origin'],
      referer: req.headers['referer'],
      'user-agent': req.headers['user-agent'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      accept: req.headers['accept'],
    },
    ip: req.ip,
    ips: req.ips,
    remoteAddress: req.socket && req.socket.remoteAddress,
    env: process.env.NODE_ENV || 'development',
    now: new Date().toISOString(),
  };
  diagLog('echo', data);
  res.set('Cache-Control', 'no-store');
  res.json(data);
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server running at http://${HOST}:${PORT}`));
