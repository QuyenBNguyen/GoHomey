import { useEffect, useRef, useState } from "react";
import { trackDriver } from "../api/rideApi";

/**
 * useDriverRoutePolling
 * - Polls the server for the driver's latest location and route to pickup.
 * - Expects server endpoint GET /rides/:id/track-driver to return:
 *   { driverId, driverLocation, toPickup, updatedAt }
 */
export function useDriverRoutePolling(options: {
  rideId: string;
  token: string;
  intervalMs?: number; // default 3000ms
  enabled?: boolean;   // default true
  minMovementMeters?: number; // default 50m
}) {
  const { rideId, token, intervalMs = 3000, enabled = true, minMovementMeters = 50 } = options;
  const [data, setData] = useState<{
    driverId?: string;
    driverLocation?: { type: string; coordinates: [number, number] };
    toPickup?: any;
    updatedAt?: string | Date;
  } | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const lastStamp = useRef<string | number | undefined>(undefined);
  const lastPt = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !rideId || !token) return;

    const tick = async () => {
      try {
        const res = await trackDriver(rideId, token);
        // Determine if movement is significant
        const coords = res?.driverLocation?.coordinates as [number, number] | undefined; // [lng, lat]
        const curr = coords ? { lat: coords[1], lng: coords[0] } : undefined;
        const movedEnough = curr && lastPt.current
          ? haversineM(lastPt.current.lat, lastPt.current.lng, curr.lat, curr.lng) >= minMovementMeters
          : true;

        const stampChanged = res?.updatedAt && res.updatedAt !== lastStamp.current;

        if (!movedEnough && !stampChanged) return;

        lastStamp.current = res?.updatedAt;
        if (curr) lastPt.current = curr;
        setData(res);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("trackDriver polling error", (e as any)?.message || e);
      }
    };

    tick();
    timer.current = setInterval(tick, intervalMs);

    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [rideId, token, intervalMs, enabled, minMovementMeters]);

  return data;
}

// Haversine distance in meters
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
