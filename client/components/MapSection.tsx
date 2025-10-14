import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
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

  // 🔹 Fallback region (Đà Nẵng city center)
  const defaultRegion = {
    latitude: 16.054407,
    longitude: 108.202164,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const center = currentLocation || homeLocation || defaultRegion;

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >

      {/* Customer marker */}
      {currentLocation && (
        <Marker coordinate={currentLocation} title="You (Customer)" pinColor="red" />
      )}

      {/* Home marker */}
      {homeLocation && (
        <Marker
          coordinate={{
            latitude: homeLocation.latitude,
            longitude: homeLocation.longitude,
          }}
          title="Home"
          pinColor="blue"
        />
      )}

        {/* Route from current location to home */}
        {routeToHome?.coordinates && (
          <Polyline
            coordinates={routeToHome.coordinates}
            strokeWidth={4}
            strokeColor="blue"
          />
        )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
