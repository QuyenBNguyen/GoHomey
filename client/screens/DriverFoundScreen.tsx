import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { getRide, trackRoute } from "../api/rideApi";
import { useDriverRoutePolling } from "../hooks/useDriverRoutePolling";
import { fetchCurrentLocationAPI, updateCurrentLocationAPI } from "../api/locationAPI";

type LatLng = { latitude: number; longitude: number };

const POLL_MS = 3000;

const DriverFoundScreen: React.FC = () => {
  const route = useRoute<any>();
  const rideParam = route?.params?.ride;
  const rideId: string | undefined = rideParam?._id || route?.params?.rideId;

  const token = useSelector((s: any) => s.auth.token) as string | undefined;

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const locRef = useRef<NodeJS.Timeout | null>(null);

  // Load ride details (pickup/dropoff)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!rideId || !token) return;
      try {
        const data = await getRide(rideId, token);
        const details = data?.details;
        if (details?.pickup?.coordinates?.length === 2) {
          const [plng, plat] = details.pickup.coordinates;
          mounted && setPickup({ latitude: plat, longitude: plng });
        }
        if (details?.dropoff?.coordinates?.length === 2) {
          const [dlng, dlat] = details.dropoff.coordinates;
          mounted && setDropoff({ latitude: dlat, longitude: dlng });
        }
      } catch (e) {
        // noop
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [rideId, token]);

  // Poll for driver location via hook, and poll route to home
  const driverData = useDriverRoutePolling({
    rideId: rideId || "",
    token: token || "",
    intervalMs: POLL_MS,
    enabled: !!(rideId && token),
    minMovementMeters: 75,
  });

  const toPickupCoords = useMemo<LatLng[]>(() => {
    const pts = driverData?.toPickup?.route as Array<{ lat: number; lng: number }> | undefined;
    if (!Array.isArray(pts)) return [];
    return pts.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  }, [driverData?.toPickup]);

  useEffect(() => {
    if (!driverData?.driverLocation?.coordinates) return;
    const [lng, lat] = driverData.driverLocation.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      setDriverLoc({ latitude: lat, longitude: lng });
    }
  }, [driverData]);

  useEffect(() => {
    const poll = async () => {
      if (!rideId || !token) return;
      try {
        // Customer -> Home recomputed route
        const r = await trackRoute(rideId, token);
        const pts = Array.isArray(r?.route)
          ? (r.route as Array<{ lat: number; lng: number }>).map((p) => ({ latitude: p.lat, longitude: p.lng }))
          : [];
        setRouteCoords(pts);
        if (typeof r?.distance === "number") setDistanceKm(r.distance);
        if (typeof r?.duration === "number") setDurationMin(r.duration);
      } catch (e) {
        // ignore
      }
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [rideId, token]);

  // Periodically update customer's current location on the server (every 10s)
  useEffect(() => {
    const push = async () => {
      if (!token) return;
      try {
        const me = await fetchCurrentLocationAPI();
        await updateCurrentLocationAPI(token, me.latitude, me.longitude);
      } catch {
        // ignore
      }
      locRef.current = setTimeout(push, 10000);
    };
    push();
    return () => {
      if (locRef.current) clearTimeout(locRef.current);
    };
  }, [token]);

  const initialRegion: Region = useMemo(() => {
    const center = pickup || dropoff || { latitude: 16.054407, longitude: 108.202164 };
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [pickup, dropoff]);

  // Derive customer current marker as first point of the route, if available
  const customerLive: LatLng | null = useMemo(() => {
    return routeCoords.length > 0 ? routeCoords[0] : null;
  }, [routeCoords]);

  // Driver info for customer to view and call
  const [driverInfo, setDriverInfo] = useState<any>(null);
  useEffect(() => {
    // reuse getRide result to derive driver info when available
    // simple approach: fetch once when screen mounts
    let mounted = true;
    const load = async () => {
      if (!rideId || !token) return;
      try {
        const data = await getRide(rideId, token);
        const r = data?.ride;
        if (mounted && r?.driverId) setDriverInfo(r.driverId);
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [rideId, token]);

  const driverName = driverInfo ? `${driverInfo.firstName ?? ""} ${driverInfo.lastName ?? ""}`.trim() : "";
  const driverPhone = driverInfo?.phone ?? "";
  const driverGender = driverInfo?.gender ?? "";
  const driverInitials = (driverName || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <MapView style={styles.map} initialRegion={initialRegion}>
          {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="#ff3b30" />}
          {dropoff && <Marker coordinate={dropoff} title="Home" pinColor="#007aff" />}
          {driverLoc && <Marker coordinate={driverLoc} title="Driver" pinColor="#34c759" />}
          {customerLive && <Marker coordinate={customerLive} title="You" pinColor="#ff9f0a" />}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007aff" />
          )}
          {toPickupCoords.length > 0 && (
            <Polyline
              coordinates={toPickupCoords}
              strokeWidth={3}
              strokeColor="#34c759"
              lineDashPattern={[8, 6]}
            />
          )}
        </MapView>

        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>Driver on the way</Text>
          {/* Driver basic info + call */}
          <View style={styles.personRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{driverInitials}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{driverName || "Driver"}</Text>
              <Text style={styles.personMeta}>{driverGender || ""}</Text>
              {!!driverPhone && <Text style={styles.personMeta}>{driverPhone}</Text>}
            </View>
            {!!driverPhone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${driverPhone}`)}>
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.metaLabel}>Distance to destination</Text>
            <Text style={styles.metaValue}>
              {distanceKm != null ? `${distanceKm.toFixed(2)} km` : "--"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.metaLabel}>ETA</Text>
            <Text style={styles.metaValue}>
              {durationMin != null ? `${Math.round(durationMin)} min` : "--"}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DriverFoundScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sheetTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee" },
  avatarText: { textAlign: "center", lineHeight: 48, fontWeight: "700", color: "#444" },
  personName: { fontSize: 16, fontWeight: "600" },
  personMeta: { color: "#666", marginTop: 2 },
  callBtn: { backgroundColor: "#4A3AFF", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  callText: { color: "#fff", fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaLabel: { fontSize: 14, color: "#666" },
  metaValue: { fontSize: 14, fontWeight: "600", color: "#111" },
});
