import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { updateUserLocation } from "../api/userApi";

/**
 * useLiveLocationUploader
 * - Starts foreground location updates and PATCHes to the server on a throttle.
 * - Throttles by time (>= minIntervalMs) and distance (>= minDistanceM).
 * - Call this hook when a ride becomes active; clean up when ride ends.
 */
export function useLiveLocationUploader(options: {
  userId: string;
  token: string;
  minIntervalMs?: number; // default 3000ms
  minDistanceM?: number;  // default 50m
  enabled?: boolean;      // default true
}) {
  const { userId, token, minIntervalMs = 3000, minDistanceM = 50, enabled = true } = options;
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastSent = useRef<{ t: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !token) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: minIntervalMs,
          distanceInterval: minDistanceM,
        },
        async ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          const now = Date.now();

          const prev = lastSent.current;
          const timeOk = !prev || now - prev.t >= minIntervalMs;
          const distOk = !prev || haversineM(prev.lat, prev.lng, lat, lng) >= minDistanceM;
          if (!timeOk && !distOk) return;

          try {
            await updateUserLocation(userId, lat, lng, token);
            lastSent.current = { t: now, lat, lng };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("updateUserLocation failed", (e as any)?.message || e);
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [userId, token, minIntervalMs, minDistanceM, enabled]);
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
