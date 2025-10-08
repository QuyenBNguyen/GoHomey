// src/api/locationAPI.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import Constants from "expo-constants";

const API_BASE =
  (Constants?.manifest?.extra?.API_BASE as string) ||
  (process.env.API_BASE as string) ||
  "http://10.12.49.53:5000";

const ORS_KEY =
  (Constants?.manifest?.extra?.ORS_KEY as string) ||
  (process.env.ORS_KEY as string) ||
  "";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface HomeLocationData extends Coordinates {
  address?: string;
  timestamp: number;
}

export interface RouteData {
  coordinates: Coordinates[];
  distance: number; // km
  duration: number; // minutes
}

export async function saveHomeLocationAPI(
  token: string,
  locationData: { latitude: number; longitude: number; address?: string }
): Promise<HomeLocationData> {
  const body = {
    lat: locationData.latitude,
    lng: locationData.longitude,
    address: locationData.address ?? "",
  };

  const res = await axios.put(`${API_BASE}/user-details/home-location`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const detail = res.data?.detail || res.data;
  const home = detail?.homeLocation || detail;

  const normalized: HomeLocationData = {
    latitude: home.lat ?? locationData.latitude,
    longitude: home.lng ?? locationData.longitude,
    address: home.address ?? locationData.address ?? "",
    timestamp: Date.now(),
  };

  await AsyncStorage.setItem("homeLocation", JSON.stringify(normalized));
  return normalized;
}

export async function fetchHomeLocationAPI(token: string): Promise<HomeLocationData | null> {
  const res = await axios.get(`${API_BASE}/user-details/home-location`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    validateStatus: (s) => s < 500,
  });

  if (res.status === 404) return null;
  if (res.status >= 400) throw new Error(res.data?.message || "Failed to fetch home location");

  const home = res.data;
  const lat = home.lat ?? home.latitude ?? home.homeLocation?.lat;
  const lng = home.lng ?? home.longitude ?? home.homeLocation?.lng;

  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const normalized: HomeLocationData = {
    latitude: lat,
    longitude: lng,
    address: home.address ?? "",
    timestamp: Date.now(),
  };

  await AsyncStorage.setItem("homeLocation", JSON.stringify(normalized));
  return normalized;
}

/* ---------- Local cache helpers ---------- */

export async function loadHomeLocationCache(): Promise<HomeLocationData | null> {
  const raw = await AsyncStorage.getItem("homeLocation");
  return raw ? (JSON.parse(raw) as HomeLocationData) : null;
}

export async function clearHomeLocationCache(): Promise<void> {
  await AsyncStorage.removeItem("homeLocation");
}

/* ---------- Expo location ---------- */

export async function fetchCurrentLocationAPI(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted");

  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}

export async function fetchRouteAPI(start: Coordinates, end: Coordinates): Promise<RouteData> {
  // If ORS key available use OpenRouteService, otherwise fallback to OSRM public API (no key)
  if (ORS_KEY) {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.features || !json.features[0]) {
      throw new Error("Invalid route response from ORS");
    }
    const coords: Coordinates[] = json.features[0].geometry.coordinates.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    }));
    const summary = json.features[0].properties.summary;
    return {
      coordinates: coords,
      distance: summary.distance / 1000,
      duration: summary.duration / 60,
    };
  } else {
    // OSRM fallback
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.routes || !json.routes[0] || !json.routes[0].geometry) {
      throw new Error("Invalid route response from OSRM fallback");
    }
    const coords: Coordinates[] = json.routes[0].geometry.coordinates.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0],
    }));
    const summary = json.routes[0].distance != null && json.routes[0].duration != null
      ? { distance: json.routes[0].distance, duration: json.routes[0].duration }
      : { distance: 0, duration: 0 };
    return {
      coordinates: coords,
      distance: summary.distance / 1000,
      duration: summary.duration / 60,
    };
  }
}
