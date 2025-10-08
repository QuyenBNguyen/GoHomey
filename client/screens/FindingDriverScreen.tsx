import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

type Props = {
  navigation: any;
};

const FindingDriverScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // After 5 seconds, navigate to next screen
      navigation.replace("DriverFound"); // 👈 change "DriverFound" to your screen name
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finding a driver near you...</Text>
      <ActivityIndicator size="large" color="#000000FF" style={{ marginTop: 20 }} />
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
