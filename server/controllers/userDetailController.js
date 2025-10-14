const UserDetail = require("../models/userDetail");


// Update home location
exports.setHomeLocation = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT auth
    const { lat, lng, address } = req.body;

    // Normalize and validate numeric coordinates
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const homeLocation = { lat: latNum, lng: lngNum };
    if (typeof address === "string") homeLocation.address = address;

    const detail = await UserDetail.findOneAndUpdate(
      { userId },
      { homeLocation },
      { new: true, upsert: true } // create if missing
    );

    res.json({ message: "Home location updated", detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting home location" });
  }
};

// Get home location
exports.getHomeLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const detail = await UserDetail.findOne({ userId });

    if (!detail || !detail.homeLocation) {
      return res.status(404).json({ message: "Home location not set" });
    }

    res.json(detail.homeLocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching home location" });
  }
};

exports.setCurrentLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng } = req.body;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }
    const currentLocation = { type: "Point", coordinates: [lngNum, latNum] };
    const detail = await UserDetail.findOneAndUpdate(
      { userId },
      { currentLocation },
      { new: true, upsert: true }
    );
    res.json({ message: "Current location updated", detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting current location" });
  }
};