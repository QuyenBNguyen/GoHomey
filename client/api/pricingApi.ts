// API requests for pricing and vehicle types (now under /rides)
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