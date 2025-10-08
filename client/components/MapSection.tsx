import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchRoute } from "../store/locationSlice";

interface MapSectionProps {
  currentLocation: { latitude: number; longitude: number };
  homeLocation: { latitude: number; longitude: number };
}

export default function MapSection({ currentLocation, homeLocation }: MapSectionProps) {
  const dispatch = useDispatch<AppDispatch>();

  const {
    driverLocation,
    routeDriverToCustomer,
    routeCustomerToHome,
  } = useSelector((state: RootState) => state.location);

  // 🔹 When we have driver + customer, fetch driver→customer route
  useEffect(() => {
    if (driverLocation && currentLocation) {
      dispatch(
        fetchRoute({
          start: driverLocation,
          end: currentLocation,
          type: "driverToCustomer",
        })
      );
    }
  }, [driverLocation, currentLocation]);

  // 🔹 When we have customer + home, fetch customer→home route
  useEffect(() => {
    if (currentLocation && homeLocation) {
      dispatch(
        fetchRoute({
          start: currentLocation,
          end: homeLocation,
          type: "customerToHome",
        })
      );
    }
  }, [currentLocation, homeLocation]);

  // 🔹 Fallback region (Đà Nẵng city center)
  const defaultRegion = {
    latitude: 16.054407,
    longitude: 108.202164,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const center = currentLocation || homeLocation || driverLocation || defaultRegion;

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
      {/* Driver marker */}
      {driverLocation && (
        <Marker coordinate={driverLocation} title="Driver" pinColor="green" />
      )}

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

      {/* Driver → Customer route */}
      {routeDriverToCustomer?.coordinates && (
        <Polyline
          coordinates={routeDriverToCustomer.coordinates}
          strokeWidth={4}
          strokeColor="black"
        />
      )}

      {/* Customer → Home route */}
      {routeCustomerToHome?.coordinates && (
        <Polyline
          coordinates={routeCustomerToHome.coordinates}
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
