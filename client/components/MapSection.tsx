import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { fetchRouteAPI, RouteData } from "../api/locationAPI";

interface MapSectionProps {
  currentLocation: { latitude: number; longitude: number };
  homeLocation: { latitude: number; longitude: number };
}

export default function MapSection({ currentLocation, homeLocation }: MapSectionProps) {
  const [routeToHome, setRouteToHome] = useState<RouteData | null>(null);

  // Fetch route from current location to home
  useEffect(() => {
    const loadRoute = async () => {
      try {
        const route = await fetchRouteAPI(currentLocation, homeLocation);
        setRouteToHome(route);
      } catch (error) {
        console.error("Failed to load route:", error);
      }
    };

    if (currentLocation && homeLocation) {
      loadRoute();
    }
  }, [currentLocation, homeLocation]);

  // 🔹 Map style: use MapLibre demo tiles by default; for production, switch to Geoapify/MapTiler style with your key
  const styleURL = "https://demotiles.maplibre.org/style.json";

  // Center coordinate
  const center = currentLocation || homeLocation || { latitude: 16.054407, longitude: 108.202164 };

  // Build GeoJSON for route line (MapLibre expects [lng, lat])
  const routeGeoJSON = useMemo(() => {
    if (!routeToHome?.coordinates?.length) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: routeToHome.coordinates.map((c) => [c.longitude, c.latitude]),
          },
          properties: {},
        },
      ],
    };
  }, [routeToHome]);

  // No token required for MapLibre
  // @ts-ignore - not all versions expose setAccessToken; safe to no-op
  if (typeof MapLibreGL.setAccessToken === 'function') {
    // @ts-ignore
    MapLibreGL.setAccessToken(null);
  }

  return (
    // @ts-ignore styleURL is supported in runtime; types may vary between versions
    <MapLibreGL.MapView style={styles.map} styleURL={styleURL} logoEnabled={false} compassEnabled>
      <MapLibreGL.Camera
        zoomLevel={13}
        centerCoordinate={[center.longitude, center.latitude]}
      />

      {currentLocation && (
        // @ts-ignore PointAnnotation can render without a custom child; supply an empty View to satisfy types
        <MapLibreGL.PointAnnotation id="current" coordinate={[currentLocation.longitude, currentLocation.latitude]}>
          <></>
        </MapLibreGL.PointAnnotation>
      )}

      {homeLocation && (
        // @ts-ignore
        <MapLibreGL.PointAnnotation id="home" coordinate={[homeLocation.longitude, homeLocation.latitude]}>
          <></>
        </MapLibreGL.PointAnnotation>
      )}

      {routeGeoJSON && (
        // @ts-ignore ShapeSource accepts FeatureCollection at runtime
        <MapLibreGL.ShapeSource id="route" shape={routeGeoJSON}>
          <MapLibreGL.LineLayer
            id="route-line"
            style={{ lineColor: "#2563eb", lineWidth: 4, lineOpacity: 0.9 }}
          />
        </MapLibreGL.ShapeSource>
      )}
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
