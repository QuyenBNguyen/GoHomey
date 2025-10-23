import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
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
// Date picker (native)
// @ts-ignore - types provided by package when installed
import DateTimePicker from "@react-native-community/datetimepicker";


export default function ProfileScreen() {
  const auth = useSelector((state: RootState) => state.auth);
  const driver = useSelector((state: RootState) => state.driver);
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
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [rating, setRating] = useState<number | null>(null);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);

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
        if (res.user?.dob) {
          const d = new Date(res.user.dob);
          setDob(d.toISOString().slice(0, 10));
          setDobDate(d);
        } else {
          setDob("");
          setDobDate(null);
        }
        setGender(res.user?.gender ?? "");
        setRating(typeof res.detail?.rating === "number" ? res.detail.rating : null);
        setHomeAddress(res.detail?.homeLocation?.address ?? null);
        setHomeLat(typeof res.detail?.homeLocation?.lat === "number" ? res.detail.homeLocation.lat : null);
        setHomeLng(typeof res.detail?.homeLocation?.lng === "number" ? res.detail.homeLocation.lng : null);
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
        <TouchableOpacity
          onPress={() => setShowDobPicker(true)}
          style={[styles.input, { justifyContent: "center" }]}
        >
          <Text>{dob ? dob : "Select date"}</Text>
        </TouchableOpacity>
        {showDobPicker && (
          <DateTimePicker
            value={dobDate || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event: any, selectedDate?: Date) => {
              setShowDobPicker(false);
              if (selectedDate) {
                setDobDate(selectedDate);
                // format YYYY-MM-DD
                const yyyy = selectedDate.getFullYear();
                const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const dd = String(selectedDate.getDate()).padStart(2, "0");
                setDob(`${yyyy}-${mm}-${dd}`);
              }
            }}
          />
        )}

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

        {homeAddress || (homeLat != null && homeLng != null) ? (
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Home address</Text>
            <Text style={styles.readOnlyValue}>
              {homeAddress || `${homeLat?.toFixed(5)}, ${homeLng?.toFixed(5)}`}
            </Text>
          </View>
        ) : (
          <View style={[styles.readOnlyRow, { alignItems: "center" }]}>
            <Text style={styles.readOnlyLabel}>Home location not set</Text>
            <TouchableOpacity
              style={{ marginTop: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#A993FF", padding: 8, borderRadius: 8 }}
              onPress={() => navigation.navigate("HomeLocationSetup", { mode: "return" })}
            >
              <Text style={{ color: "#A993FF" }}>Set Home Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Role and status (read only) */}
        {user && (
          <>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Role</Text>
              <Text style={styles.readOnlyValue}>{user.role}</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Status</Text>
              <Text style={styles.readOnlyValue}>{user.status}</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>

        {/* Driver vehicle info */}
        {auth.user?.role === "Driver" && detail?.vehicles && (
          <View style={styles.vehicleSection}>
            <Text style={styles.vehicleSectionTitle}>Vehicle Information</Text>
            {detail.vehicles.length === 0 ? (
              <Text style={styles.vehicleEmpty}>No vehicle info available.</Text>
            ) : (
              detail.vehicles.map((v: any, idx: number) => (
                <View key={v._id || idx} style={styles.vehicleCard}>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="car-outline" size={22} color="#6C63FF" style={{ marginRight: 8 }} />
                    <Text style={styles.vehicleText}><Text style={styles.vehicleLabel}>Type:</Text> {v.type}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="color-palette-outline" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
                    <Text style={styles.vehicleText}><Text style={styles.vehicleLabel}>Color:</Text> {v.color}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="card-outline" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
                    <Text style={styles.vehicleText}><Text style={styles.vehicleLabel}>License:</Text> {v.license}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Ionicons name="pricetag-outline" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
                    <Text style={styles.vehicleText}><Text style={styles.vehicleLabel}>Plate:</Text> {v.plate}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
  vehicleSection: {
    marginTop: 32,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    shadowColor: "#A993FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleSectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#4A3AFF",
    marginBottom: 10,
    marginLeft: 2,
  },
  vehicleCard: {
    backgroundColor: "#F3F0FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#A993FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  vehicleLabel: {
    fontWeight: "bold",
    color: "#6C63FF",
  },
  vehicleText: {
    fontSize: 15,
    color: "#222",
  },
  vehicleEmpty: {
    color: "#888",
    fontStyle: "italic",
    marginBottom: 8,
    marginLeft: 2,
  },
});
