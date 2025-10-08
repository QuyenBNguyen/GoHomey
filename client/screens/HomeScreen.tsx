// HomeScreen.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import {
  fetchCurrentLocation,
  loadHomeLocation,
} from "../store/locationSlice";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  // animated logo scale
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const logoScale = logoScaleAnim;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScaleAnim, { toValue: 1.06, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScaleAnim, { toValue: 1.0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [logoScaleAnim]);

  const { homeLocation, status } = useSelector(
    (state: RootState) => state.location
  );

  const loading = status === "loading";

  useEffect(() => {
    // Load home location from backend or local storage
    dispatch(loadHomeLocation());
  }, [dispatch]);

  const handleGoHome = async () => {
    // Validate home location has real coordinates (object alone is truthy)
    const hasValidCoords =
      homeLocation &&
      typeof homeLocation.latitude === "number" &&
      typeof homeLocation.longitude === "number" &&
      Number.isFinite(homeLocation.latitude) &&
      Number.isFinite(homeLocation.longitude);

    // Case 1: No valid home location set
    if (!hasValidCoords) {
      Alert.alert(
        "Home Location Not Set",
        "Please set your home location first to use the 'Go Home' feature.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Home Location",
            onPress: () => navigation.navigate("HomeLocationSetup"),
          },
        ]
      );
      console.log("Navigating to HomeLocationSetup");
      return;
    }

    // Case 2: Home location exists → get current location and go to map
    try {
      await dispatch(fetchCurrentLocation()).unwrap();
      navigation.navigate("Map", {
        // pass locations if MapScreen expects params
        homeLocation,
      });
      console.log("Navigating to Map with homeLocation:", homeLocation);
    } catch (error) {
      Alert.alert(
        "Location Error",
        "Failed to get your current location. Please check location permissions.",
        [{ text: "OK", style: "cancel" }]
      );
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["top", "left", "right"]}
    >
      <ScrollView style={styles.container}>
        {/* Top row: logo (left) + profile (right) */}
        <View style={styles.topRow}>
          <View style={styles.logoWrap}>
            <Animated.Image
              source={require("../assets/logo.png")}
              style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            />
            <Text style={styles.logoSubtitle}>Reliable rides, Happy homes</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-circle" size={40} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Big Go Home Button */}
        <TouchableOpacity
          style={[styles.goHomeBtn, loading && styles.goHomeBtnDisabled]}
          onPress={handleGoHome}
          disabled={loading}
        >
          <Text style={styles.goHomeText}>
            {loading ? "Getting Location..." : "Go Home"}
          </Text>
        </TouchableOpacity>

        {/* Quick access icons */}
        <View style={styles.quickRow}>
          <View style={styles.quickItem}>
            <Ionicons name="car" size={30} color="#000" />
            <Text>Transport</Text>
          </View>
          <View style={styles.quickItem}>
            <Ionicons name="pricetag" size={30} color="#000" />
            <Text>Offers</Text>
          </View>
          <View style={styles.quickItem}>
            <Ionicons name="card" size={30} color="#000" />
            <Text>Gift Cards</Text>
          </View>
          <View style={styles.quickItem}>
            <Ionicons name="ellipsis-horizontal" size={30} color="#000" />
            <Text>More</Text>
          </View>
        </View>

        {/* Small cards */}
        <View style={styles.smallRow}>
          <View style={styles.smallCard}>
            <Ionicons name="card" size={28} color="#000" />
            <Text style={styles.smallText}>Activate HomeyPay</Text>
          </View>

          <View style={styles.smallCard}>
            <Ionicons name="sparkles" size={28} color="#000" />
            <Text style={styles.smallText}>Use Points {"\n"}758</Text>
          </View>
        </View>

        {/* Promotions */}
        <Text style={styles.sectionTitle}>Check out these promotions!</Text>
        <View style={styles.promoGrid}>
          <View style={styles.promoItem}>
            <Image
              source={require("../assets/happy-hour-1.jpg")}
              style={styles.promoImage}
            />
            <Text style={styles.promoText}>
              Free 1 beer for every 5 pints
            </Text>
          </View>
          <View style={styles.promoItem}>
            <Image
              source={require("../assets/happy-hour-2.jpg")}
              style={styles.promoImage}
            />
            <Text style={styles.promoText}>Happy Hour Sales 20% off</Text>
          </View>
          <View style={styles.promoItem}>
            <Image
              source={require("../assets/happy-hour-3.jpg")}
              style={styles.promoImage}
            />
            <Text style={styles.promoText}>Live Music Night Promo</Text>
          </View>
          <View style={styles.promoItem}>
            <Image
              source={require("../assets/happy-hour-4.jpg")}
              style={styles.promoImage}
            />
            <Text style={styles.promoText}>$4 Meal Deal</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D6BEFFFF",
    padding: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingHorizontal: 16,
    height: 220, // bigger top area to push main button down
  },
  logo: {
    width: 160,
    height: 80,
    resizeMode: "contain",
  },
  logoWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logoSubtitle: {
    marginTop: 6,
    color: "#555",
    fontSize: 12,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: { marginLeft: -35 },
  goHomeBtn: {
    backgroundColor: "#000000FF",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  goHomeText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  goHomeBtnDisabled: {
    backgroundColor: "#666",
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "#BE9AFCFF",
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 20,
  },
  smallRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  smallCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BE9AFCFF",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  smallText: {
    flexShrink: 1,
    paddingLeft: 10,
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
  },
  promoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  promoItem: {
    width: "48%",
    marginBottom: 16,
  },
  promoImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    resizeMode: "cover",
  },
  promoText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
});
