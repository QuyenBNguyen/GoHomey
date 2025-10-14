import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { getRide } from "../api/rideApi";
import { getNearbyDriversByType } from "../api/driverApi";
import { useSelector } from "react-redux";

type Props = {
  navigation: any;
  route: any;
};

const POLL_INTERVAL = 3000; // ms
const STAGE_MS = 45000; // 45s per stage
const STAGES = [3, 5, 7]; // km

const FindingDriverScreen: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDriverTimeout, setNoDriverTimeout] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  // Get token from Redux
  const token = useSelector((state: any) => state.auth.token);

  // Get rideId from navigation params (support both rideId and ride)
  const rideId = route?.params?.rideId || route?.params?.ride?._id;
  const pickup = route?.params?.pickup;
  const vehicleTypeId = route?.params?.vehicleTypeId;

  useEffect(() => {
    if (!rideId) {
      setError("Missing ride ID");
      setLoading(false);
      return;
    }

    const pollRideStatus = async () => {
      try {
        const rideData = await getRide(rideId, token || "");
        if (rideData.ride && rideData.ride.status === "Accepted" && rideData.ride.driverId) {
          setLoading(false);
          navigation.replace("DriverFound", { ride: rideData.ride });
          return;
        }
        // Start or continue staged driver search if not yet accepted
        if (!searching && pickup && vehicleTypeId) {
          setSearching(true);
          // seed first stage with any drivers passed from previous screen
          let currentStage = 0;
          const doStageSearch = async () => {
            const radiusKm = STAGES[currentStage];
            try {
              const drivers = await getNearbyDriversByType(pickup.lat, pickup.lng, vehicleTypeId, token || "", radiusKm);
              if (Array.isArray(drivers) && drivers.length > 0) {
                // We found candidates; ride may get accepted shortly by one of them
                // Keep polling for acceptance; no-op here
              }
            } catch (e) {
              // ignore stage search errors; continue polling
            }
            currentStage += 1;
            if (currentStage < STAGES.length) {
              stageTimerRef.current = setTimeout(doStageSearch, STAGE_MS);
            } else {
              // After last stage, set the timeout flag so we show message at ~2m15s
              timeoutRef.current = setTimeout(() => setNoDriverTimeout(true), STAGE_MS);
            }
          };
          // Kick off staged search after initial 45s, unless we already are beyond
          stageTimerRef.current = setTimeout(doStageSearch, STAGE_MS);
        }
        // Show message if all stages elapsed and still no acceptance
        if (noDriverTimeout) {
          setError("No drivers available nearby. Please try again in a few minutes.");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error polling ride status:", err);
        setError("Error polling ride status");
      }
      pollRef.current = setTimeout(pollRideStatus, POLL_INTERVAL);
    };

    pollRideStatus();
    // No immediate timeout; handled by staged search timing

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, [rideId, navigation, pickup, vehicleTypeId, noDriverTimeout, searching, token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finding a driver near you...</Text>
      {loading && <ActivityIndicator size="large" color="#000000FF" style={{ marginTop: 20 }} />}
      {error && <Text style={{ color: "red", marginTop: 20 }}>{error}</Text>}
    </View>
  );
};

export default FindingDriverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D6BEFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});
