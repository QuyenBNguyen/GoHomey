import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface VehicleOptionsProps {
  onConfirm: (vehicle: string | null) => void;
  distance: string;
}

export default function VehicleOptions({ onConfirm, distance }: VehicleOptionsProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {/* Distance Info */}
      <Text style={styles.distanceText}>Current Location → Home</Text>
      <Text style={styles.subText}>Distance: ~{distance}</Text>

      <Text style={styles.title}>Choose your vehicle</Text>

      {/* Motorcycle Option */}
      <TouchableOpacity
        style={[styles.option, selectedVehicle === "bike" && styles.selected]}
        onPress={() => setSelectedVehicle("bike")}
      >
        <Ionicons name="bicycle" size={28} color="#000" />
        <Text style={styles.optionText}>Motorcycle</Text>
        <Text style={styles.price}>25.000 VND</Text>
      </TouchableOpacity>

      {/* Car Option */}
      <TouchableOpacity
        style={[styles.option, selectedVehicle === "car" && styles.selected]}
        onPress={() => setSelectedVehicle("car")}
      >
        <Ionicons name="car" size={28} color="#000" />
        <Text style={styles.optionText}>Car</Text>
        <Text style={styles.price}>50.000 VND</Text>
      </TouchableOpacity>

      {/* Confirm Button */}
      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => onConfirm(selectedVehicle)}
      >
        <Text style={styles.confirmText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  distanceText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  subText: {
    color: "#555",
    marginBottom: 12,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  selected: {
    borderColor: "#A77AF3",
    borderWidth: 2,
    backgroundColor: "#EDE3FF",
  },
  optionText: { flex: 1, marginLeft: 12, fontWeight: "600" },
  price: { color: "#555" },
  confirmBtn: {
    backgroundColor: "#A77AF3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  confirmText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
