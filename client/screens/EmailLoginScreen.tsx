import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";
import { useNavigation } from "@react-navigation/native";
import { requestOtp } from "../api/authApi"; // ✅ import backend call
import AppHeader from "../components/AppHeader";

type EmailLoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EmailLogin"
>;

const EmailLoginScreen = () => {
  const navigation = useNavigation<EmailLoginScreenNavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = email.toLowerCase().includes("@");
  const canProceed = emailValid && password.length > 0; // require password with email

  const handleNext = async () => {
    if (!canProceed) return;
    setLoading(true);
    try {
      await requestOtp(email, password); 
      Alert.alert("Success", "OTP sent to your email");
  // pass password so VerifyCode can resend if needed
  navigation.navigate("VerifyCode", { email, password });
    } catch (err: any) {
      // If server says user not found, navigate to Register with prefilled values
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || "Failed to send OTP";
      if (status === 404) {
        Alert.alert("Info", "Account not found — please register.");
        navigation.navigate("Register", { email, password });
      } else {
        // show axios error message if available for debugging
        const networkMsg = err?.message || msg;
        Alert.alert("Error", `${msg}\n${networkMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} />
      {/* Header */}
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome! Sign in with your email</Text>
        <Text style={styles.subtitle}>
          Enter your email and password. You will receive an OTP to confirm sign-in.
        </Text>
      </View>

      {/* Input */}
      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Register link */}
      <TouchableOpacity onPress={() => navigation.navigate("Register", {email, password})}>
        <Text style={styles.registerText}>Don't have an account? Register</Text>
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextBtn, (!canProceed || loading) && { backgroundColor: "#ccc" }]}
        disabled={!canProceed || loading}
        onPress={handleNext}
      >
        <Text style={styles.nextText}>{loading ? "Sending..." : "Next"}</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
};

export default EmailLoginScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20, alignItems: "stretch"
  },
  header: {
    marginTop: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  registerText: {
    color: "#4A4A4A",
    textAlign: "center",
    marginVertical: 12,
    textDecorationLine: "underline",
    padding: 10,
  },
  nextBtn: {
    backgroundColor: "#A993FF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
