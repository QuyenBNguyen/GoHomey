import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";
import { useNavigation } from "@react-navigation/native";

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBackground}>
        <Text style={styles.logo}>GoHomey</Text>
        <Text style={styles.subtitle}>Too lit to drive? GoHomey’s got you.</Text>
      </View>

      <Svg
      height={120}
      width="100%"
      viewBox="0 0 1440 320"
      style={{ marginBottom: 0, ...styles.wave }}
    >
      <Path
        fill="#A993FF" 
        d="M0,160L60,154.7C120,149,240,139,360,149.3C480,160,600,192,720,181.3C840,171,960,117,1080,85.3C1200,53,1320,43,1380,37.3L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
      />
    </Svg>

      <View style={styles.bottomSection}>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("EmailLogin")}>
          <Text style={styles.buttonText}>Log In with Email</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBackground: {
    backgroundColor: "#A993FF",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    marginTop: -10, // so no white gap
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: "#333",
  },
  bottomSection: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#A993FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signUpBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingVertical: 12,
    width: "90%",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
});
