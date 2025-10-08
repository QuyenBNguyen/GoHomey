const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {authMiddleware} = require("../middlewares/authMiddleware");
const permitRoles = require("../middlewares/roleMiddleware");

// Admin-only CRUD for users
router.post("/", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.createUser);
router.get("/", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.getUsers);
router.get("/:id", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.getUserById);
router.put("/:id", authMiddleware, 
    userController.updateUser);
router.delete("/:id", authMiddleware, 
    permitRoles(["Admin"]), 
    userController.deleteUser);

// Current user's profile endpoints
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);

module.exports = router;
