import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { RootStackParamList } from "../navigation/navigation";
import { fetchCurrentLocation } from "../store/locationSlice";

import MapSection from "../components/MapSection";
import VehicleOptions from "../components/VehicleOptions";

type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Map"
>;

export default function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { currentLocation, homeLocation } = useSelector(
    (state: RootState) => state.location
  );

  // 🔹 Fetch customer’s live location when screen mounts
  useEffect(() => {
    dispatch(fetchCurrentLocation());
  }, [dispatch]);

  // Fallback coords in case nothing available yet
  const defaultCurrentLocation = { latitude: 16.054407, longitude: 108.202164 };
const defaultHomeLocation = { latitude: 16.054407, longitude: 108.202164 };

  const currentLoc = currentLocation || defaultCurrentLocation;
  const homeLoc = homeLocation || defaultHomeLocation;

  const handleConfirm = (vehicle: string | null) => {
    if (vehicle) {
      console.log("User selected:", vehicle);
      navigation.navigate("FindingDriver");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Map */}
        <MapSection currentLocation={currentLoc}
  homeLocation={homeLoc}/>

        {/* Vehicle Options */}
        <VehicleOptions onConfirm={handleConfirm} distance="5.2 km" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
