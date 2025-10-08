const axios = require("axios");

async function getRouteInfo(pickup, dropoff) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
  
  const res = await axios.get(url, {
    params: {
      api_key: process.env.ORS_API_KEY, 
      start: `${pickup.lng},${pickup.lat}`,
      end: `${dropoff.lng},${dropoff.lat}`,
    },
  });

  const data = res.data.features[0];
  return {
    distance: data.properties.summary.distance / 1000, // km
    duration: data.properties.summary.duration / 60,   // min
    route: data.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  };
}

module.exports = { getRouteInfo };
