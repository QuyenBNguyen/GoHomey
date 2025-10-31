import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import * as Location from "expo-location";
import { updateCurrentLocationAPI } from "../api/locationAPI";

type Props = {
  variant?: "light" | "dark";
  onUpdated?: (lat: number, lng: number) => void;
  position?: { bottom?: number; right?: number; left?: number };
};

export default function MapActions({ variant = "light", onUpdated, position }: Props) {
  const navigation = useNavigation();
  const token = useSelector((s: any) => s?.auth?.token) as string | undefined;
  const [busy, setBusy] = useState(false);

  const doUpdate = async () => {
    try {
      setBusy(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Enable location permission to update your location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      if (!token) {
        Alert.alert("Not signed in", "Sign in to update your backend location.");
        onUpdated?.(lat, lng);
        return;
      }
      await updateCurrentLocationAPI(token, lat, lng);
      onUpdated?.(lat, lng);
      Alert.alert("Location updated", `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch (e: any) {
      console.log("[MapActions] update error", e?.message || e);
      Alert.alert("Error", "Failed to update location.");
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    // If there is no back stack, navigate to Home
    // @ts-ignore
    if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
    // @ts-ignore
    else navigation.navigate("Home" as never);
  };

  const containerStyle = [styles.container, position];
  const btnStyle = [styles.btn, variant === "dark" && styles.btnDark];
  const textStyle = [styles.text, variant === "dark" && styles.textDark];

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <TouchableOpacity style={btnStyle} onPress={doUpdate} disabled={busy}>
        {busy ? <ActivityIndicator size="small" color={variant === "dark" ? "#000" : "#fff"} /> : <Text style={textStyle}>Update my location</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={btnStyle} onPress={goBack}>
        <Text style={textStyle}>Return</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    bottom: 110,
    gap: 8,
  },
  btn: {
    backgroundColor: "#FF7A00",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 160,
  },
  text: { color: "#fff", fontWeight: "600" },
  btnDark: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  textDark: { color: "#111" },
});
