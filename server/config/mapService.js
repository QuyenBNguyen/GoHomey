const axios = require("axios");

// Simple haversine distance between two lat/lng points in kilometers
function haversineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

async function tryOpenRouteService(pickup, dropoff) {
  const url = process.env.ORS_BASE_URL || "https://api.openrouteservice.org/v2/directions/driving-car";
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    throw new Error("ORS_API_KEY missing");
  }
  const res = await axios.get(url, {
    params: {
      api_key: apiKey,
      start: `${pickup.lng},${pickup.lat}`,
      end: `${dropoff.lng},${dropoff.lat}`,
    },
    timeout: Number(process.env.MAPS_HTTP_TIMEOUT_MS || 4000),
  });

  const data = res.data.features?.[0];
  if (!data?.properties?.summary) {
    throw new Error("ORS response malformed");
  }
  return {
    distance: data.properties.summary.distance / 1000, // km
    duration: data.properties.summary.duration / 60, // min
    route: (data.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng })),
  };
}

function computeFallbackRoute(pickup, dropoff) {
  const straightKm = haversineDistanceKm(pickup, dropoff);
  const routeFactor = Number(process.env.ROUTE_FALLBACK_ROUTE_FACTOR || 1.2); // inflate straight line
  const speedKmh = Number(process.env.ROUTE_FALLBACK_SPEED_KMH || 30); // typical city speed
  const distance = straightKm * routeFactor;
  const duration = (distance / Math.max(speedKmh, 1)) * 60; // minutes
  // Minimal route polyline as straight segment
  const route = [
    { lat: pickup.lat, lng: pickup.lng },
    { lat: dropoff.lat, lng: dropoff.lng },
  ];
  return { distance, duration, route };
}

async function tryGeoapifyRouting(pickup, dropoff) {
  const waypoints = `${pickup.lng},${pickup.lat}|${dropoff.lng},${dropoff.lat}`; // lon,lat|lon,lat
  const timeout = Number(process.env.MAPS_HTTP_TIMEOUT_MS || 4000);

  // 1) If a full URL is provided (including mode/apiKey), reuse it and only swap waypoints
  const urlFromEnv = process.env.GEOAPIFY_ROUTING_URL;
  if (urlFromEnv) {
    try {
      const u = new URL(urlFromEnv);
      // Always overwrite waypoints with live inputs
      u.searchParams.set("waypoints", waypoints);
      // Ensure mode present (prefer explicit GEOAPIFY_MODE if set)
      if (process.env.GEOAPIFY_MODE) {
        u.searchParams.set("mode", process.env.GEOAPIFY_MODE);
      } else if (!u.searchParams.get("mode")) {
        u.searchParams.set("mode", "drive");
      }
      // Ensure apiKey present
      const apiKeyEnv = process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_ROUTING_API_KEY;
      if (!u.searchParams.get("apiKey") && apiKeyEnv) {
        u.searchParams.set("apiKey", apiKeyEnv);
      }
      const res = await axios.get(u.toString(), { timeout });
      const feat = res.data?.features?.[0];
      if (!feat) throw new Error("Geoapify response missing features[0]");
      const props = feat.properties || {};
      const distMeters = props.distance ?? props.summary?.distance;
      const timeSeconds = props.time ?? props.summary?.time ?? props.summary?.duration;
      if (typeof distMeters !== "number" || typeof timeSeconds !== "number") {
        throw new Error("Geoapify response missing distance/time");
      }
      const coords = feat.geometry?.coordinates || [];
      const line = Array.isArray(coords[0]?.[0]) ? coords.flat() : coords;
      return {
        distance: distMeters / 1000,
        duration: timeSeconds / 60,
        route: line.map(([lng, lat]) => ({ lat, lng })),
      };
    } catch (e) {
      // If the provided URL is malformed or fails, fall through to base+params strategy
      console.warn("[mapService] GEOAPIFY_ROUTING_URL failed:", e?.message || e);
    }
  }

  // 2) Build from base url + params
  const base = process.env.GEOAPIFY_BASE_URL || "https://api.geoapify.com/v1/routing";
  const apiKey = process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_ROUTING_API_KEY;
  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY missing (set GEOAPIFY_API_KEY or GEOAPIFY_ROUTING_API_KEY)");
  }
  const res = await axios.get(base, {
    params: {
      waypoints,
      mode: process.env.GEOAPIFY_MODE || "drive",
      apiKey,
    },
    timeout,
  });

  const feat = res.data?.features?.[0];
  if (!feat) throw new Error("Geoapify response missing features[0]");
  const props = feat.properties || {};
  // distance in meters, time in seconds
  const distMeters = props.distance ?? props.summary?.distance;
  const timeSeconds = props.time ?? props.summary?.time ?? props.summary?.duration;
  if (typeof distMeters !== "number" || typeof timeSeconds !== "number") {
    throw new Error("Geoapify response missing distance/time");
  }
  const coords = feat.geometry?.coordinates || [];
  // LineString: [ [lng,lat], ... ] or MultiLineString: [ [ [lng,lat], ... ] ]
  const line = Array.isArray(coords[0]?.[0]) ? coords.flat() : coords;
  return {
    distance: distMeters / 1000, // km
    duration: timeSeconds / 60, // min
    route: line.map(([lng, lat]) => ({ lat, lng })),
  };
}

async function getRouteInfo(pickup, dropoff) {
  try {
    return await tryOpenRouteService(pickup, dropoff);
  } catch (err) {
    console.warn("[mapService] ORS failed:", err?.message || err);
    try {
      return await tryGeoapifyRouting(pickup, dropoff);
    } catch (err2) {
      console.warn("[mapService] Geoapify failed, using fallback:", err2?.message || err2);
      return computeFallbackRoute(pickup, dropoff);
    }
  }
}

module.exports = { getRouteInfo };
