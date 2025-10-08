import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { getUserProfile, updateUserProfile } from "../api/userApi";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/navigation";
import AppHeader from "../components/AppHeader";


export default function ProfileScreen() {
  const auth = useSelector((state: RootState) => state.auth);
  const token = auth?.token;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Profile">>();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [rating, setRating] = useState<number | null>(null);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        let t = token;
        if (!t) {
          t = await AsyncStorage.getItem("token");
        }
        if (!t) {
          // no token available
          Alert.alert("Not signed in", "Please sign in to view your profile.", [{ text: "OK" }]);
          setLoading(false);
          return;
        }

        const res = await getUserProfile(t);
        if (!active) return;
        setUser(res.user);
        setDetail(res.detail);
        setFirstName(res.user?.firstName ?? "");
        setLastName(res.user?.lastName ?? "");
        setPhone(res.user?.phone ?? "");
        setEmail(res.user?.email ?? "");
        setEmergencyContact(res.detail?.emergencyContact ?? "");
        setDob(res.user?.dob ? new Date(res.user.dob).toISOString().slice(0, 10) : "");
        setGender(res.user?.gender ?? "");
        setRating(typeof res.detail?.rating === "number" ? res.detail.rating : null);
        setHomeAddress(res.detail?.homeLocation?.address ?? null);
      } catch (err: any) {
        console.error("Failed to load profile", err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          Alert.alert("Session expired", "Please sign in again.", [
            { text: "OK", onPress: () => navigation.navigate("Login") },
          ]);
        } else {
          Alert.alert("Error", "Failed to load profile");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSave = async () => {
    if (!token) return Alert.alert("Not signed in");
    setSaving(true);
    try {
      // prepare payload
      const payload: any = { firstName, lastName, phone, email, emergencyContact };
      if (dob) payload.dob = dob; // server will parse
      if (gender) payload.gender = gender;
      const res = await updateUserProfile(payload, token);
      setUser(res.user);
      setDetail(res.detail);
      Alert.alert("Success", "Profile updated");
    } catch (err) {
      console.error("Save error", err);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AppHeader onBack={() => navigation.goBack()} showBack={true} title="Profile" />

      <View style={styles.form}>
        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={styles.label}>Date of birth</Text>
        <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {(["Male", "Female", "Other"] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Emergency contact</Text>
        <TextInput style={styles.input} value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" />

        {/* Read-only fields from userDetail */}
        {rating !== null && (
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Rating</Text>
            <Text style={styles.readOnlyValue}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {homeAddress ? (
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Home address</Text>
            <Text style={styles.readOnlyValue}>{homeAddress}</Text>
          </View>
        ) : (
          <View style={[styles.readOnlyRow, { alignItems: "center" }]}>
            <Text style={styles.readOnlyLabel}>Home location not set</Text>
            <TouchableOpacity
              style={{ marginTop: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#A993FF", padding: 8, borderRadius: 8 }}
              onPress={() => navigation.navigate("HomeLocationSetup")}
            >
              <Text style={{ color: "#A993FF" }}>Set Home Location</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginTop: 6 },
  genderRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  genderBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  genderBtnActive: { backgroundColor: "#A993FF", borderColor: "#A993FF" },
  genderText: { color: "#333" },
  genderTextActive: { color: "#fff" },
  saveBtn: { marginTop: 20, backgroundColor: "#A993FF", padding: 14, borderRadius: 10, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  readOnlyRow: { marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  readOnlyLabel: { fontSize: 13, color: "#666" },
  readOnlyValue: { fontSize: 14, fontWeight: "600", marginTop: 4 },
});
