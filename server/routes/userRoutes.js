const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {authMiddleware} = require("../middlewares/authMiddleware");
const permitRoles = require("../middlewares/roleMiddleware");

// Current user's profile endpoints (put these BEFORE /:id routes to avoid conflicts)
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);

// Live location update endpoint (self or admin)
router.patch("/:id/location", authMiddleware, userController.updateLocation);

// Admin-only CRUD for users
router.post("/", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.createUser);
router.get("/",
    userController.getUsers);
router.get("/:id", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.getUserById);
router.put("/:id", authMiddleware, 
    userController.updateUser);
router.delete("/:id", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.deleteUser);

module.exports = router;
