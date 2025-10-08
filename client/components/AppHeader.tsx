import React from "react";
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = SCREEN_HEIGHT / 5;

type Props = {
  onBack?: () => void;
  showBack?: boolean;
  title?: string;
};

export default function AppHeader({ onBack, showBack = true, title }: Props) {
  // computed numeric logo height avoids percent sizing issues
  const logoHeight = Math.max(36, HEADER_HEIGHT * 0.45);

  let logoSource;
  try {
    // confirm correct relative path to your asset
    logoSource = require("../assets/logo.png");
  } catch (_) {
    logoSource = null;
  }

  return (
    <View style={[styles.container, { height: HEADER_HEIGHT }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        )}

        {logoSource ? (
          <Image
            source={logoSource}
            style={[styles.logo, { height: logoHeight }]}
            resizeMode="contain"
            accessibilityLabel="App logo"
          />
        ) : (
          <Text style={styles.logoFallback}>GoHomey</Text>
        )}
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#BE9AFCFF",
    width: "100%",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 150,
    marginLeft: 8,
  },
  logoFallback: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginRight: 8,
  },
});