const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");
const {setHomeLocation, getHomeLocation} = require("../controllers/userDetailController");

router.put("/home-location", authMiddleware, setHomeLocation);
router.get("/home-location", authMiddleware, getHomeLocation);

module.exports = router;
