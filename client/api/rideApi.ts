import { API_BASE } from "./config";

export interface VehicleType {
  _id: string;
  type: "Car" | "Motorbike";
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  surgeMultiplier: number;
}

export interface PriceCalculation {
  vehicleType: VehicleType;
  totalPrice: number;
  route?: {
    distance: number;
    duration: number;
  };
  breakdown: {
    baseFare: number;
    distanceCost: number;
    timeCost: number;
    surgeMultiplier: number;
  };
}

// Get all vehicle types
export async function getVehicleTypes(): Promise<VehicleType[]> {
  const res = await fetch(`${API_BASE}/rides/vehicle-types`);
  if (!res.ok) throw new Error("Failed to fetch vehicle types");
  return res.json();
}

// Get price estimate for route
export async function getPriceEstimate(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<PriceCalculation[]> {
  const body = {
    pickup,
    dropoff
  };
  const res = await fetch(`${API_BASE}/rides/estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to get price estimate");
  return res.json();
}

// Create Ride Request
export async function createRide(
  pickup: { lat: number; lng: number; address?: string },
  dropoff: { lat: number; lng: number; address?: string },
  vehicleTypeId: string,
  token: string
): Promise<any> {
  const body = { pickup, dropoff, vehicleTypeId };
  const res = await fetch(`${API_BASE}/rides`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create ride");
  return res.json();
}

// Get Ride by ID
export async function getRide(id: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${id}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch ride");
  return res.json();
}

// Update Ride Status
export async function updateRideStatus(id: string, status: string, driverId?: string, vehicleId?: string, token?: string): Promise<any> {
  const body: any = { status };
  if (driverId) body.driverId = driverId;
  if (vehicleId) body.vehicleId = vehicleId;
  const res = await fetch(`${API_BASE}/rides/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update ride status");
  return res.json();
}

// Delete Ride
export async function deleteRide(id: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete ride");
  return res.json();
}

// Find Nearby Drivers
export async function findNearbyDrivers(pickup: { lat: number; lng: number }, token: string): Promise<any[]> {
  const body = { pickup };
  const res = await fetch(`${API_BASE}/rides/find-drivers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to find nearby drivers");
  return res.json();
}

// Track Driver
export async function trackDriver(rideId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/track-driver`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to track driver");
  return res.json();
}

// Track Route
export async function trackRoute(rideId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/track-route`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to track route");
  return res.json();
}

// Track Customer (for driver to see customer movement)
export async function trackCustomer(rideId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/track-customer`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to track customer");
  return res.json();
}

// Accept a ride (atomic)
export async function acceptRide(rideId: string, driverId: string, token: string, vehicleId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ driverId, ...(vehicleId ? { vehicleId } : {}) })
  });
  if (res.status === 409) {
    throw new Error("Ride already accepted by another driver");
  }
  if (!res.ok) throw new Error("Failed to accept ride");
  return res.json();
}
