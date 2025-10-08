const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
  dob: Date,
  phone: { type: String, unique: true, sparse: true, trim: true }, // optional but unique if provided
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String }, // hashed password
  role: { type: String, enum: ["Customer", "Driver", "Admin"], default: "Customer" },
  status: { type: String, enum: ["Active", "Blocked", "Pending"], default: "Active" }
}, { timestamps: true });

// Hash password automatically when set/modified
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  try {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
