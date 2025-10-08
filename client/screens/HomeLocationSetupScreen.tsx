import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import { saveHomeLocation } from "../store/locationSlice";
import AppHeader from "../components/AppHeader";

interface Props {
  navigation: any;
  route: any;
}

export default function HomeLocationSetupScreen({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [homeLocation, setHomeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 16.054407,   // Da Nang center
    longitude: 108.202164, // Da Nang center
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Search UI
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // simple debounce for search
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      runSearch(searchQuery);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const runSearch = async (q: string) => {
    try {
      setSearching(true);
      // Nominatim forward geocode
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "GoHomeyApp/1.0 (+your-email@example.com)",
        },
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to set your home location."
        );
        setLoading(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);

      // Set map region to current location
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        setHomeAddress(
          `${addr.street || ""} ${addr.name || ""}, ${addr.city || ""}, ${addr.region || ""}`.trim()
        );
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your current location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setHomeLocation({ latitude, longitude });

    // Update address when user taps on map
    reverseGeocode(latitude, longitude);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address.length > 0) {
        const addr = address[0];
        setHomeAddress(
          `${addr.street || ""} ${addr.name || ""}, ${addr.city || ""}, ${addr.region || ""}`.trim()
        );
      } else {
        setHomeAddress("");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lon)) return;

    const display = item.display_name || `${item.address?.road || ""} ${item.address?.city || ""}`.trim();
    setHomeLocation({ latitude: lat, longitude: lon });
    setHomeAddress(display);
    setMapRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSearchResults([]);
    setSearchQuery(display);
    Keyboard.dismiss();
  };

  const handleConfirmHomeLocation = async () => {
    if (!homeLocation) {
      Alert.alert("Error", "Please select your home location on the map.");
      return;
    }

    setLoading(true);
    try {
      // Store home location data
      const homeLocationData = {
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude,
        address: homeAddress ?? "",
        timestamp: Date.now(),
      };

      // Dispatch to Redux store and AsyncStorage
      await dispatch(saveHomeLocation(homeLocationData)).unwrap();

      Alert.alert(
        "Success",
        "Home location set successfully!",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("Home"),
          },
        ]
      );
    } catch (error) {
      console.error("Error saving home location:", error);
      Alert.alert("Error", "Failed to save home location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (location) {
      setHomeLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      reverseGeocode(location.coords.latitude, location.coords.longitude);
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} title="Set Home Location" />

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Tap on the map to set your home location, or search / use your current location.
        </Text>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#666" style={{ marginLeft: 8 }} />
          <TextInput
            placeholder="Search address or place"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(searchQuery)}
          />
          {searching ? (
            <ActivityIndicator style={{ marginRight: 8 }} />
          ) : (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
              <Ionicons name="close" size={18} color="#666" style={{ marginRight: 8 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id?.toString() ?? item.osm_id?.toString() ?? item.lat + item.lon}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectSearchResult(item)}>
                  <Text style={styles.resultText}>{item.display_name}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A993FF" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {homeLocation && (
              <Marker
                coordinate={homeLocation}
                title="Your Home"
                pinColor="blue"
              />
            )}
          </MapView>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.useCurrentBtn}
            onPress={handleUseCurrentLocation}
            disabled={!location || loading}
          >
            <Ionicons name="locate" size={20} color="#A993FF" />
            <Text style={styles.useCurrentText}>Use Current Location</Text>
          </TouchableOpacity>

          {homeAddress ? (
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Selected Address:</Text>
              <Text style={styles.addressText}>{homeAddress}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmBtn, !homeLocation && styles.confirmBtnDisabled]}
            onPress={handleConfirmHomeLocation}
            disabled={!homeLocation || loading}
          >
            <Text style={styles.confirmBtnText}>Confirm Home Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 12,
  },
  instruction: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
    color: "#666",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
  },
  resultsContainer: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultText: {
    fontSize: 13,
    color: "#333",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  map: {
    flex: 1,
  },
  controls: {
    gap: 12,
  },
  useCurrentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#A993FF",
    borderRadius: 8,
    backgroundColor: "#f8f6ff",
  },
  useCurrentText: {
    marginLeft: 8,
    color: "#A993FF",
    fontWeight: "500",
  },
  addressContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
  },
  confirmBtn: {
    backgroundColor: "#A993FF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#ccc",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
