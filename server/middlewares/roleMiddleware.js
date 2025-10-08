const user = require("../models/user");

const permitRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user; // from authMiddleware
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
    };
};
module.exports = permitRoles;
