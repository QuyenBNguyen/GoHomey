import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const DriverFoundScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825, // example coords
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Pickup marker */}
        <Marker coordinate={{ latitude: 37.78825, longitude: -122.4324 }} />
        {/* Destination marker */}
        <Marker coordinate={{ latitude: 37.78925, longitude: -122.4224 }} />
      </MapView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Driver Tracking</Text>

        {/* Driver Info */}
        <View style={styles.driverRow}>
          <Image
            source={{
              uri: "https://randomuser.me/api/portraits/men/32.jpg", // placeholder driver photo
            }}
            style={styles.driverImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>Cameron Williamson</Text>
            <Text style={styles.driverRole}>Delivery Man</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="call-outline" size={24} color="#4a90e2" />
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        <View style={styles.locationBlock}>
          <Ionicons name="location-outline" size={20} color="#4a90e2" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.locationLabel}>Your Location</Text>
            <Text style={styles.locationText}>
              2972 Westheimer Rd. Santa Ana, Illinois 85486
            </Text>
          </View>
        </View>

        <View style={styles.locationBlock}>
          <Ionicons name="flag-outline" size={20} color="#4a90e2" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.locationLabel}>Your Destination</Text>
            <Text style={styles.locationText}>
              1248 Saint Patrick Rd
            </Text>
          </View>
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  driverImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
  },
  driverRole: {
    fontSize: 14,
    color: "#666",
  },
  locationBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  locationLabel: {
    fontSize: 13,
    color: "#888",
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
});
