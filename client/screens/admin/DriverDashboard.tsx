import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../store/store";
import { fetchDriverProfile, fetchDriverDailySummary } from "../../store/driverSlice";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/navigation";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DriverDashboard() {
  const dispatch = useAppDispatch();
  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<NavigationProp>();
  const { profile, dailySummary, loading, error } = useSelector((state: RootState) => state.driver);
  const { user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.id && token) {
      dispatch(fetchDriverProfile({ driverId: user.id, token }));
      dispatch(fetchDriverDailySummary({ driverId: user.id, token }));
    }
  }, [user?.id, token, dispatch]);

  const handleProfilePress = () => {
    navigation.getParent()?.navigate("Profile");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
            <Ionicons name="person-circle" size={40} color="#4A3AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4A3AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
            <Ionicons name="person-circle" size={40} color="#4A3AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

    return (
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("RideRequests")}>
            <Ionicons name="map-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("DriverDashboard")}> 
            <Ionicons name="notifications-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
            <Ionicons name="person-circle" size={32} color="#B19EFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>
            Hello, {profile?.driver?.firstName || "Driver"}
          </Text>
          <Text style={styles.greetingSubText}>Today's summary</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.topRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="car" size={20} color="#B19EFF" />
                <Text style={styles.statLabel}>Rides</Text>
              </View>
              <Text style={styles.statValue}>{dailySummary?.totalRides ?? "0"}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="star" size={20} color="#B19EFF" />
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <Text style={styles.statValue}>
                {dailySummary?.rating ? dailySummary.rating.toFixed(1) : "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.fullWidth]}>
            <View style={styles.statHeader}>
              <Ionicons name="wallet" size={20} color="#B19EFF" />
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <Text style={styles.statValue}>
              {dailySummary?.totalEarnings ? 
                `${dailySummary.totalEarnings.toLocaleString()} VND` : "0 VND"}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F3FF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  greetingBox: {
    marginBottom: 32,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  greetingSubText: {
    fontSize: 16,
    color: "#6B7280",
  },
  statsGrid: {
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F5F3FF",
    shadowColor: "#B19EFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  fullWidth: {
    flex: 0,
    width: "100%",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  }
});
