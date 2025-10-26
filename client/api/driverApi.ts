
// API requests for driver dashboard
import { Platform } from "react-native";
import { API_BASE } from "./config";

// All functions assume JWT token is available
export async function getDriverProfile(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch driver profile");
  return res.json();
}

export async function getDriverDailySummary(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/daily-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch daily summary");
  return res.json();
}

export async function getDriverUpcomingRequests(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/upcoming-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch upcoming requests");
  return res.json();
}

export async function updateDriverStatus(driverId: string, token: string, online: boolean) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: online ? "Online" : "Offline" }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

// Add more driver-related API calls as needed
// Get all drivers (admin)
export async function getAllDrivers(token: string) {
  const res = await fetch(`${API_BASE}/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}

// Ban a driver (admin)
export async function banDriver(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to ban driver");
  return res.json();
}

// Update driver profile
export async function updateDriverProfile(driverId: string, token: string, data: any) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update driver profile");
  return res.json();
}

// Add or update vehicle
export async function addOrUpdateVehicle(driverId: string, token: string, vehicle: any) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/vehicle`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vehicle),
  });
  if (!res.ok) throw new Error("Failed to add/update vehicle");
  return res.json();
}

// Get driver vehicles
export async function getDriverVehicles(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  return res.json();
}

// Get driver rides
export async function getDriverRides(driverId: string, token: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/rides`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch rides");
  return res.json();
}

// Get driver ratings (paginated)
export async function getDriverRatings(driverId: string, token: string, page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/ratings?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch ratings");
  return res.json();
}

// Add rating for a driver (optional, not enabled in routes)
export async function addDriverRating(driverId: string, token: string, rating: number, comment = "") {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/ratings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) throw new Error("Failed to add rating");
  return res.json();
}

// Update driver availability (online/offline)
export async function updateAvailability(driverId: string, token: string, status: string) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update availability");
  return res.json();
}

export async function updateDriverLocation(driverId: string, token: string, lat: number, lng: number) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}/location`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) throw new Error("Failed to update driver location");
  return res.json();
}

// Get all nearby drivers with same vehicle type
export async function getNearbyDriversByType(lat: number, lng: number, vehicleTypeId: string, token: string, radiusKm?: number) {
  const res = await fetch(`${API_BASE}/drivers/nearby`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lng, vehicleTypeId, radiusKm }),
  });
  if (!res.ok) throw new Error("Failed to fetch nearby drivers");
  return res.json();
}

// List available, unassigned ride requests for a driver (nearby + vehicle type match)
export async function getAvailableRideRequests(
  driverId: string,
  token: string,
  opts?: { lat?: number; lng?: number; radiusKm?: number }
) {
  const params = new URLSearchParams();
  if (opts?.lat != null) params.set("lat", String(opts.lat));
  if (opts?.lng != null) params.set("lng", String(opts.lng));
  if (opts?.radiusKm != null) params.set("radiusKm", String(opts.radiusKm));
  const qs = params.toString();
  const url = `${API_BASE}/drivers/${driverId}/available-requests${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch available ride requests");
  return res.json();
}