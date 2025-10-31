import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PriceCalculation, getVehicleTypes, getPriceEstimate } from "../api/rideApi";

interface VehicleOptionsProps {
  onConfirm: (vehicle: string | null, price?: number) => void;
  distance: number; // in km
  duration: number; // in minutes
  formattedDistance: string; // for display
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}

export default function VehicleOptions({ onConfirm, distance, duration, formattedDistance, pickup, dropoff }: VehicleOptionsProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [priceCalculations, setPriceCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [calculatedDistance, setCalculatedDistance] = useState<string>("Calculating...");
    const [calculatedDuration, setCalculatedDuration] = useState<number>(0);

  useEffect(() => {
    loadPrices();
  }, [pickup, dropoff]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use actual pickup/dropoff for price estimation
      const calculations = await getPriceEstimate(pickup, dropoff);
      setPriceCalculations(calculations);
      
        // Extract distance and duration from the first calculation's route
        if (calculations.length > 0 && calculations[0].route) {
          const route = calculations[0].route;
          setCalculatedDistance(`${route.distance.toFixed(1)} km`);
          setCalculatedDuration(route.duration);
        }
    } catch (err) {
      console.error("Error loading prices:", err);
      setError("Failed to load prices");
      setPriceCalculations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + " VND";
  };

  const getSelectedPrice = () => {
    if (!selectedVehicle) return undefined;
    const calculation = priceCalculations.find(calc => 
      calc.vehicleType.type.toLowerCase() === selectedVehicle
    );
    return calculation?.totalPrice;
  };

  const handleConfirm = () => {
    const price = getSelectedPrice();
    onConfirm(selectedVehicle, price);
  };

  return (
    <View style={styles.container}>
      {/* Distance Info */}
      <Text style={styles.distanceText}>Current Location → Home</Text>
    <Text style={styles.subText}>Distance: ~{calculatedDistance}</Text>

      <Text style={styles.title}>Choose your vehicle</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A00" />
          <Text style={styles.loadingText}>Loading prices...</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {priceCalculations.map((calculation) => {
            const vehicleKey = calculation.vehicleType.type.toLowerCase();
            const isSelected = selectedVehicle === vehicleKey;
            return (
              <TouchableOpacity
                key={calculation.vehicleType._id}
                style={[styles.option, isSelected && styles.selected]}
                onPress={() => setSelectedVehicle(vehicleKey)}
              >
                <Ionicons 
                  name={calculation.vehicleType.type === "Car" ? "car" : "bicycle"} 
                  size={28} 
                  color="#000" 
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{calculation.vehicleType.type}</Text>
                  <Text style={styles.breakdown}>
                    Base: {formatPrice(calculation.breakdown.baseFare)} • 
                    Distance: {formatPrice(calculation.breakdown.distanceCost)} • 
                    Time: {formatPrice(calculation.breakdown.timeCost)}
                  </Text>
                </View>
                <Text style={styles.price}>{formatPrice(calculation.totalPrice)}</Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmBtn, !selectedVehicle && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selectedVehicle}
      >
        <Text style={styles.confirmText}>
          {selectedVehicle ? `Confirm - ${formatPrice(getSelectedPrice() || 0)}` : "Select a vehicle"}
        </Text>
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  errorText: {
    color: "#FF4444",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  selected: {
    borderColor: "#FF7A00",
    borderWidth: 2,
    backgroundColor: "#FFF3E6",
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionText: { 
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  breakdown: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  price: { 
    color: "#333",
    fontWeight: "bold",
    fontSize: 14,
  },
  confirmBtn: {
    backgroundColor: "#FF7A00",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  confirmBtnDisabled: {
    backgroundColor: "#ccc",
  },
  confirmText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
});
