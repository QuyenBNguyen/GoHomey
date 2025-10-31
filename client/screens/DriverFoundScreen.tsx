import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapActions from "../components/MapActions";
import { useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { getRide, trackRoute } from "../api/rideApi";
import { useDriverRoutePolling } from "../hooks/useDriverRoutePolling";
import { fetchCurrentLocationAPI, updateCurrentLocationAPI } from "../api/locationAPI";
import Constants from "expo-constants";

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

  const styleURL =
    ((Constants as any).expoConfig?.extra?.MAP_STYLE_URL as string) ||
    ((Constants as any).manifest?.extra?.MAP_STYLE_URL as string) ||
    "https://demotiles.maplibre.org/style.json";

  const cameraCenter: LatLng = useMemo(() => {
    return pickup || dropoff || { latitude: 16.054407, longitude: 108.202164 };
  }, [pickup, dropoff]);

  const toPickupGeo = useMemo(() => {
    if (!toPickupCoords.length) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: toPickupCoords.map((c) => [c.longitude, c.latitude]) },
          properties: {},
        },
      ],
    } as const;
  }, [toPickupCoords]);

  const routeGeo = useMemo(() => {
    if (!routeCoords.length) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: routeCoords.map((c) => [c.longitude, c.latitude]) },
          properties: {},
        },
      ],
    } as const;
  }, [routeCoords]);

  // @ts-ignore
  if (typeof MapLibreGL.setAccessToken === 'function') {
    // @ts-ignore
    MapLibreGL.setAccessToken(null);
  }

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
        {/* @ts-ignore styleURL prop available at runtime */}
        <MapLibreGL.MapView style={styles.map} styleURL={styleURL} logoEnabled={false} compassEnabled>
          <MapLibreGL.Camera zoomLevel={15} centerCoordinate={[cameraCenter.longitude, cameraCenter.latitude]} />

          {pickup && (
            // @ts-ignore
            <MapLibreGL.PointAnnotation id="pickup" coordinate={[pickup.longitude, pickup.latitude]}>
              <></>
            </MapLibreGL.PointAnnotation>
          )}
          {dropoff && (
            // @ts-ignore
            <MapLibreGL.PointAnnotation id="dropoff" coordinate={[dropoff.longitude, dropoff.latitude]}>
              <></>
            </MapLibreGL.PointAnnotation>
          )}
          {driverLoc && (
            // @ts-ignore
            <MapLibreGL.PointAnnotation id="driver" coordinate={[driverLoc.longitude, driverLoc.latitude]}>
              <></>
            </MapLibreGL.PointAnnotation>
          )}
          {customerLive && (
            // @ts-ignore
            <MapLibreGL.PointAnnotation id="customer" coordinate={[customerLive.longitude, customerLive.latitude]}>
              <></>
            </MapLibreGL.PointAnnotation>
          )}

          {routeGeo && (
            // @ts-ignore
            <MapLibreGL.ShapeSource id="route" shape={routeGeo}>
              <MapLibreGL.LineLayer id="route-line" style={{ lineColor: "#007aff", lineWidth: 4 }} />
            </MapLibreGL.ShapeSource>
          )}
          {toPickupGeo && (
            // @ts-ignore
            <MapLibreGL.ShapeSource id="to-pickup" shape={toPickupGeo}>
              <MapLibreGL.LineLayer id="to-pickup-line" style={{ lineColor: "#34c759", lineWidth: 3, lineDasharray: [2, 2] }} />
            </MapLibreGL.ShapeSource>
          )}

          {/* Attribution overlay */}
          <View pointerEvents="none" style={styles.attributionWrap}>
            <Text style={styles.attributionText}>
              © OpenStreetMap contributors
              {(() => {
                const extra = (Constants as any).expoConfig?.extra || (Constants as any).manifest?.extra || {};
                const add = (extra.MAP_ATTRIBUTION as string) || ((styleURL || "").includes("geoapify.com") ? " · © Geoapify" : "");
                return add ? ` · ${add.replace(/^\s*·\s*/, "")}` : "";
              })()}
            </Text>
          </View>
        </MapLibreGL.MapView>

  {/* Quick actions: update my location + return */}
  <MapActions position={{ right: 12, bottom: 120 }} />

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
  attributionWrap: {
    position: "absolute",
    right: 8,
    bottom: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: { fontSize: 11, color: "#333" },
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
  callBtn: { backgroundColor: "#FF7A00", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  callText: { color: "#fff", fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaLabel: { fontSize: 14, color: "#666" },
  metaValue: { fontSize: 14, fontWeight: "600", color: "#111" },
});
