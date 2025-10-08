import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DriverDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>
      <Text>✅ Completed rides: 42</Text>
      <Text>⭐ Rating: 4.8</Text>
      <Text>💰 Earnings: 12,500,000 VND</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
});
