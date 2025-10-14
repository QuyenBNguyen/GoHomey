const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const {setHomeLocation, getHomeLocation, setCurrentLocation} = require("../controllers/userDetailController");


router.put("/home-location", authMiddleware, setHomeLocation);
router.get("/home-location", authMiddleware, getHomeLocation);

// New: update current location for any user
router.put("/current-location", authMiddleware, setCurrentLocation);

module.exports = router;
