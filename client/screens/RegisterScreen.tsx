import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { register } from "../api/authApi";
import { RootStackParamList } from "../navigation/navigation";
import AppHeader from "../components/AppHeader";

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyCode'>;

export default function RegisterScreen({ route }: any) {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { email: preEmail, password: prePassword } = route?.params ?? {};
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(preEmail ?? "");
  const [password, setPassword] = useState(prePassword ?? "");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !phone) {
      Alert.alert("Error", "Please fill all required fields (including phone)");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== repeatPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, phone });
      Alert.alert("Success", "Registered. OTP sent to your email");
      navigation.navigate("VerifyCode", { email });
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 , backgroundColor: "#fff"}} edges={["top", "left", "right"]}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create account</Text>
        <View style={styles.nameRow}>
          <TextInput placeholder="First name" style={[styles.input, styles.nameInput]} value={firstName} onChangeText={setFirstName} />
          <TextInput placeholder="Last name" style={[styles.input, styles.nameInput]} value={lastName} onChangeText={setLastName} />
        </View>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <View style={styles.inputRow}>
          <TextInput placeholder="Password" style={[styles.input, styles.flexInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((s) => !s)}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <TextInput placeholder="Repeat password" style={[styles.input, styles.flexInput]} value={repeatPassword} onChangeText={setRepeatPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((s) => !s)}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <TextInput placeholder="Phone (required)" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Registering..." : "Register"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "stretch" },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 15, borderRadius: 8, marginBottom: 15 },
  btn: { backgroundColor: "#A993FF", padding: 14, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "700" },
  nameRow: { flexDirection: "row", justifyContent: "space-between" },
  nameInput: { flex: 1, marginRight: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  flexInput: { flex: 1 },
  eyeBtn: { padding: 10 },
});