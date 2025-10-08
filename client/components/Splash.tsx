// Splash.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";

const Splash = ({ onFinish }: { onFinish: () => void }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait a bit, then fade out
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800, // fade duration
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1000); // delay before fade starts

    return () => clearTimeout(timer);
  }, [opacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
        <Image source={require('../assets/logo.png')} style={{ width: 300 , height: 150, marginBottom: 20 }} />
        <Text style={styles.logo}>GoHomey</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A993FF", 
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
});

export default Splash;
