const User = require("../models/user");
const UserDetail = require("../models/userDetail");

// ✅ Create user
exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // Create empty detail entry too (optional)
    const userDetail = new UserDetail({ userId: user._id });
    await userDetail.save();

    res.status(201).json({ user, userDetail });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error creating user", error: err.message });
  }
};

// ✅ Get all users with search + filter
exports.getUsers = async (req, res) => {
  try {
    const { search, role, status, gender } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;
    if (gender) query.gender = gender;

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// ✅ Get user by ID (with details)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const detail = await UserDetail.findOne({ userId: user._id });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user, detail });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user" });
  }
};

// ✅ Update user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Error updating user", error: err.message });
  }
};

// ✅ Delete user (and details)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await UserDetail.findOneAndDelete({ userId: user._id });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
};

// ✅ Get current user's profile (uses auth middleware to set req.user)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const detail = await UserDetail.findOne({ userId });
    res.json({ user, detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// ✅ Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, email, dob, gender, emergencyContact } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone, email, dob, gender },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    // Update detail (e.g., emergencyContact) if provided
    const detailUpdates = {};
    if (typeof emergencyContact !== "undefined") detailUpdates.emergencyContact = emergencyContact;

    let detail = null;
    if (Object.keys(detailUpdates).length > 0) {
      detail = await UserDetail.findOneAndUpdate({ userId }, detailUpdates, { new: true, upsert: true });
    } else {
      detail = await UserDetail.findOne({ userId });
    }

    res.json({ user, detail });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating profile", error: err.message });
  }
};
