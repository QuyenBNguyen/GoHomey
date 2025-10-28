import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapActions from "../components/MapActions";
import { useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { getRide, trackDriver, trackRoute } from "../api/rideApi";
import { useLiveLocationUploader } from "../hooks/useLiveLocationUploader";
import Constants from "expo-constants";

type LatLng = { latitude: number; longitude: number };

const POLL_MS = 3000;

export default function DriverNavigateScreen() {
  const route = useRoute<any>();
  const rideId: string | undefined = route?.params?.rideId;
  const { token, user } = useSelector((s: any) => s.auth) as { token?: string; user?: { id: string } };

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
  const [toPickupCoords, setToPickupCoords] = useState<LatLng[]>([]);
  const [toDropoffCoords, setToDropoffCoords] = useState<LatLng[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Upload driver's live location while this screen is active
  useLiveLocationUploader({ userId: user?.id || "", token: token || "", enabled: !!(user?.id && token), minIntervalMs: 3000, minDistanceM: 50 });

  // Load ride details and customer info
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!rideId || !token) return;
      try {
        const data = await getRide(rideId, token);
        const details = data?.details;
        const r = data?.ride;
        if (details?.pickup?.coordinates?.length === 2) {
          const [plng, plat] = details.pickup.coordinates;
          mounted && setPickup({ latitude: plat, longitude: plng });
        }
        if (details?.dropoff?.coordinates?.length === 2) {
          const [dlng, dlat] = details.dropoff.coordinates;
          mounted && setDropoff({ latitude: dlat, longitude: dlng });
        }
        if (r?.customerId) setCustomer(r.customerId);
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [rideId, token]);

  // Poll for driver->pickup and (after pickup) customer->home routes
  useEffect(() => {
    const poll = async () => {
      if (!rideId || !token) return;
      try {
        const d = await trackDriver(rideId, token);
        if (d?.driverLocation?.coordinates) {
          const [lng, lat] = d.driverLocation.coordinates;
          setDriverLoc({ latitude: lat, longitude: lng });
        }
        const tp = d?.toPickup?.route as Array<{ lat: number; lng: number }> | undefined;
        setToPickupCoords(Array.isArray(tp) ? tp.map((p) => ({ latitude: p.lat, longitude: p.lng })) : []);

        const toHome = await trackRoute(rideId, token);
        const th = toHome?.route as Array<{ lat: number; lng: number }> | undefined;
        setToDropoffCoords(Array.isArray(th) ? th.map((p) => ({ latitude: p.lat, longitude: p.lng })) : []);
      } catch {}
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [rideId, token]);

  // Map style URL from config (Geoapify/MapTiler/self-hosted), fallback to demo tiles
  const styleURL =
    ((Constants as any).expoConfig?.extra?.MAP_STYLE_URL as string) ||
    ((Constants as any).manifest?.extra?.MAP_STYLE_URL as string) ||
    "https://demotiles.maplibre.org/style.json";

  const cameraCenter: LatLng = useMemo(() => {
    return pickup || dropoff || { latitude: 16.054407, longitude: 108.202164 };
  }, [pickup, dropoff]);

  // Build GeoJSON FeatureCollections for polylines
  const toPickupGeo = useMemo(() => {
    if (!toPickupCoords.length) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: toPickupCoords.map((c) => [c.longitude, c.latitude]),
          },
          properties: {},
        },
      ],
    } as const;
  }, [toPickupCoords]);

  const toDropoffGeo = useMemo(() => {
    if (!toDropoffCoords.length) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: toDropoffCoords.map((c) => [c.longitude, c.latitude]),
          },
          properties: {},
        },
      ],
    } as const;
  }, [toDropoffCoords]);

  // No token required for MapLibre
  // @ts-ignore
  if (typeof MapLibreGL.setAccessToken === 'function') {
    // @ts-ignore
    MapLibreGL.setAccessToken(null);
  }

  const customerName = customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "";
  const customerPhone = customer?.phone ?? "";
  const customerGender = customer?.gender ?? "";
  const initials = (customerName || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* @ts-ignore styleURL prop is available at runtime */}
        <MapLibreGL.MapView style={styles.map} styleURL={styleURL} logoEnabled={false} compassEnabled>
          <MapLibreGL.Camera
            zoomLevel={13}
            centerCoordinate={[cameraCenter.longitude, cameraCenter.latitude]}
          />

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

          {toPickupGeo && (
            // @ts-ignore
            <MapLibreGL.ShapeSource id="to-pickup" shape={toPickupGeo}>
              <MapLibreGL.LineLayer id="to-pickup-line" style={{ lineColor: "#34c759", lineWidth: 3, lineDasharray: [2, 2] }} />
            </MapLibreGL.ShapeSource>
          )}
          {toDropoffGeo && (
            // @ts-ignore
            <MapLibreGL.ShapeSource id="to-dropoff" shape={toDropoffGeo}>
              <MapLibreGL.LineLayer id="to-dropoff-line" style={{ lineColor: "#007aff", lineWidth: 4 }} />
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

        {/* Bottom sheet: customer basic info + call */}
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>Navigate to customer / destination</Text>
          <View style={styles.personRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{customerName || "Customer"}</Text>
              <Text style={styles.personMeta}>{customerGender || ""}</Text>
              {!!customerPhone && <Text style={styles.personMeta}>{customerPhone}</Text>}
            </View>
            {!!customerPhone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sheetTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee" },
  avatarText: { textAlign: "center", lineHeight: 48, fontWeight: "700", color: "#444" },
  personName: { fontSize: 16, fontWeight: "600" },
  personMeta: { color: "#666", marginTop: 2 },
  callBtn: { backgroundColor: "#34c759", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  callText: { color: "#fff", fontWeight: "600" },
});
