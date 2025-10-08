// src/screens/VerifyCodeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyOtpForEmail } from "../store/authSlice";
import { requestOtp, verifyOtp } from "../api/authApi";
import AppHeader from "../components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";



export default function VerifyCodeScreen({ route }: any) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList,"VerifyCode">>();
  const { email, password } = route.params ?? {};
  const dispatch = useDispatch<AppDispatch>();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // move focus to next
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (text: string, index: number) => {
    if (!text && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async () => {
    const otp = code.join("");
    if (otp.length < 6) {
      Alert.alert("Error", "Please enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await dispatch(verifyOtpForEmail({ email, otp })).unwrap();
      Alert.alert("Success", "Email verified successfully!");
      console.log("Token:", res.token);
      console.log("Email:", res.user.email);
      await AsyncStorage.setItem("token", res.token);
      console.log("Token saved to AsyncStorage:", res.token);
      console.log("Navigating to Home screen");
      navigation.navigate("Home");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Invalid OTP");
      console.log("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      // include password if provided (helps when navigating from EmailLogin)
      await requestOtp(email, password);
      Alert.alert("Success", "New verification code sent!");
      setCode(["", "", "", "", "", ""]);
      setResendCooldown(60);
      inputs.current[0]?.focus();
    } catch (err) {
      Alert.alert("Error", "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} title="Verify Code" />
      <View style={styles.container}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>We sent a code to {email}</Text>

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                nativeEvent.key === "Backspace" &&
                handleBackspace(digit, index)
              }
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.verifyBtn, loading && { backgroundColor: "#ccc" }]}
          onPress={verifyCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Resend link */}
        <TouchableOpacity onPress={resendCode} disabled={loading || resendCooldown > 0}>
          <Text style={styles.resendText}>
            Haven’t received?{" "}
            <Text style={{ color: "#4A3AFF", fontWeight: "bold" }}>
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 30, textAlign: "center" },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  otpInput: {
    width: 50,
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    marginHorizontal: 5,
  },
  verifyBtn: {
    backgroundColor: "#4A3AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  verifyText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resendText: { fontSize: 14, color: "#555" },
});
