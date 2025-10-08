// src/screens/PhoneLoginScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

interface Props {
  navigation: any;
}

export default function PhoneLoginScreen() {
  const navigation = useNavigation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const formatVietnamesePhone = (phoneNumber: string) => {
    // Remove all spaces, dashes, and other non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If already has country code, return as is
    if (cleaned.startsWith('+84')) {
      return cleaned;
    }
    
    // If starts with +, assume it's international format
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If starts with 84, add +
    if (cleaned.startsWith('84')) {
      return `+${cleaned}`;
    }
    
    // If starts with 0 (Vietnamese format), replace with +84
    if (cleaned.startsWith('0')) {
      return `+84${cleaned.substring(1)}`;
    }
    
    // If 9-10 digits without country code, assume Vietnamese
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      return `+84${cleaned}`;
    }
    
    // Otherwise, add + if not present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    // Format phone number for Vietnam
    const formattedPhone = formatVietnamesePhone(phone.trim());

    setLoading(true);
    try {
      const confirmation = await sendOTPWithFirebase(formattedPhone);
      Alert.alert("Success", "OTP sent successfully!");
      navigation.navigate("VerifyCode", { confirmation, phoneNumber: formattedPhone });
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} title="Phone Login" />
      <View style={styles.container}>
        <Text style={styles.title}>Login with Phone</Text>
        <Text style={styles.subtitle}>Enter your Vietnamese phone number</Text>
        <Text style={styles.hint}>
          You can enter: 0912345678 or 912345678 or +84912345678
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0912345678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Button 
          title={loading ? "Sending..." : "Send OTP"} 
          onPress={sendOtp} 
          disabled={!phone.trim() || loading} 
        />
        {loading && <ActivityIndicator style={styles.loader} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 16, marginBottom: 8, textAlign: "center", color: "#666" },
  hint: { 
    fontSize: 14, 
    marginBottom: 20, 
    textAlign: "center", 
    color: "#888",
    fontStyle: "italic"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  loader: {
    marginTop: 10,
  },
});
