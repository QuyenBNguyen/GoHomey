import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";

import MapSection from "../components/MapSection";
import VehicleOptions from "../components/VehicleOptions";
import MapActions from "../components/MapActions";
import { createRide, findNearbyDrivers } from "../api/rideApi";



type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Map">;
type MapScreenRouteProp = NativeStackScreenProps<RootStackParamList, "Map">["route"];

export default function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const route = useRoute<MapScreenRouteProp>();
  // Get token from Redux
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useSelector } = require("react-redux");
  const token = useSelector((state: any) => state.auth.token);

  // Get locations from navigation params (passed from HomeScreen)
  const { homeLocation, currentLocation } = route.params;

  // Convert to lat/lng format for API calls
  const pickup = {
    lat: currentLocation.latitude,
    lng: currentLocation.longitude,
  };

  const dropoff = {
    lat: homeLocation.latitude,
    lng: homeLocation.longitude,
  };

  const handleConfirm = async (vehicle: string | null, price?: number) => {
    if (!vehicle) return;

    // Find the selected vehicleTypeId from priceCalculations (passed as prop or fetched in VehicleOptions)
    // For now, let's assume VehicleOptions can pass vehicleTypeId as the vehicle string (or you can refactor to pass the id)

    // You may want to refactor VehicleOptions to pass vehicleTypeId instead of type string for reliability

    // For demo, let's fetch vehicle types and match
    try {
      // Fetch all vehicle types
      const vehicleTypes = await import("../api/rideApi").then(m => m.getVehicleTypes());
      const selectedType = vehicleTypes.find(v => v.type.toLowerCase() === vehicle);
      if (!selectedType) throw new Error("Vehicle type not found");

      // Create ride request with token
      const ride = await createRide(pickup, dropoff, selectedType._id, token);
      console.log("Ride created:", ride);

      // Fetch all available drivers nearby with same vehicle type
      const { getNearbyDriversByType } = await import("../api/driverApi");
  const drivers = await getNearbyDriversByType(pickup.lat, pickup.lng, selectedType._id, token, 3);
      console.log("Matched drivers:", drivers);

      // Navigate to FindingDriver screen (pass ride and drivers if needed)
  navigation.navigate("FindingDriver", { rideId: ride.ride?._id || ride._id, drivers, pickup, vehicleTypeId: selectedType._id });
    } catch (err) {
      console.error("Error confirming ride:", err);
      // Optionally show error to user
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Map */}
        <MapSection 
          currentLocation={currentLocation}
          homeLocation={homeLocation}
        />

        {/* Quick actions: update my location + return */}
        <MapActions position={{ right: 12, bottom: 170 }} />

        {/* Vehicle Options */}
        <VehicleOptions 
          onConfirm={handleConfirm}
          distance={0} // Will be calculated by the component
          duration={0} // Will be calculated by the component
          formattedDistance="Calculating..." // Will be updated by the component
          pickup={pickup}
          dropoff={dropoff}
        />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
});