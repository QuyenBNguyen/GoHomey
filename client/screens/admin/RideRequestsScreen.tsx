import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { getAvailableRideRequests } from "../../api/driverApi";
import { acceptRide } from "../../api/rideApi";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface RideRequestItem {
  rideId: string;
  price: number;
  distance?: number;
  duration?: number;
  status: string;
  vehicleTypeId: string;
  pickup?: { address?: string; coordinates?: [number, number] };
  dropoff?: { address?: string; coordinates?: [number, number] };
  distanceKmFromDriver?: number | null;
  createdAt?: string;
}

export default function RideRequestsScreen() {
  const { token, user } = useSelector((s: RootState) => s.auth);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [requests, setRequests] = useState<RideRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const driverId = user?.id;

  const load = useCallback(async () => {
    if (!driverId || !token) return;
    setLoading(true);
    try {
      const data = await getAvailableRideRequests(driverId, token);
      setRequests(data);
    } catch (e) {
      console.warn("Failed to load ride requests", e);
    } finally {
      setLoading(false);
    }
  }, [driverId, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (rideId: string) => {
    if (!driverId || !token) return;
    try {
      await acceptRide(rideId, driverId, token);
      // Remove from the list optimistically
      setRequests(prev => prev.filter(r => r.rideId !== rideId));
      // Navigate to driver's navigation screen
      navigation.navigate("DriverNavigate", { rideId });
    } catch (e: any) {
      alert(e?.message || "Failed to accept ride");
      // Refresh in case someone else accepted
      load();
    }
  };

  const renderItem = ({ item }: { item: RideRequestItem }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.price}>{item.price?.toLocaleString()} VND</Text>
        <Text style={styles.badge}>{item.status}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="navigate" size={16} color="#6B7280" />
        <Text style={styles.addr} numberOfLines={1}>{item.pickup?.address || "Pickup"}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="flag-outline" size={16} color="#6B7280" />
        <Text style={styles.addr} numberOfLines={1}>{item.dropoff?.address || "Dropoff"}</Text>
      </View>
      <View style={styles.meta}>
        {item.distanceKmFromDriver != null && (
          <Text style={styles.metaText}>{item.distanceKmFromDriver.toFixed(2)} km away</Text>
        )}
        {item.distance != null && (
          <Text style={styles.metaText}> • Trip: {item.distance} km</Text>
        )}
        {item.duration != null && (
          <Text style={styles.metaText}> • {item.duration} min</Text>
        )}
      </View>
      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.rideId)}>
        <Ionicons name="checkmark-circle" size={18} color="#fff" />
        <Text style={styles.acceptText}>Accept</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Requests</Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.rideId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No requests nearby</Text></View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#000" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  price: { fontSize: 18, fontWeight: "700", color: "#111827" },
  badge: { fontSize: 12, color: "#6B7280" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  addr: { color: "#374151", flex: 1 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  metaText: { color: "#6B7280", fontSize: 12 },
  acceptBtn: {
    marginTop: 12,
    backgroundColor: "#FF7A00",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  acceptText: { color: "#fff", fontWeight: "600" },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { color: "#6B7280" },
});
