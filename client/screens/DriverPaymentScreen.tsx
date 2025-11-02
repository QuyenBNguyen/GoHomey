import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { createVietqr, markPaidCash, markPaidTransfer } from "../api/paymentApi";

export default function DriverPaymentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { rideId } = route.params || {};
  const { token } = useSelector((s: any) => s.auth) as { token?: string };

  const [loading, setLoading] = useState(true);
  const [txId, setTxId] = useState<string | undefined>(route.params?.transactionId);
  const [qrUrl, setQrUrl] = useState<string | undefined>(route.params?.qrUrl);
  const [amount, setAmount] = useState<number | undefined>(route.params?.amount);
  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    const init = async () => {
      if (!rideId || !token) return;
      try {
        setLoading(true);
        const r = await createVietqr(rideId, token);
        setTxId(r.transactionId);
        setQrUrl(r.qrUrl);
        setAmount(r.amount);
        setMeta(r.meta || {});
      } catch (e: any) {
        Alert.alert("Payment", e?.message || "Failed to initialize payment");
      } finally {
        setLoading(false);
      }
    };
    if (!txId || !qrUrl) init(); else setLoading(false);
  }, [rideId, token]);

  const onPaidCash = async () => {
    if (!txId || !token) return;
    try {
      setLoading(true);
      await markPaidCash(txId, token);
      Alert.alert("Payment", "Cash received. Transaction completed.", [
        { text: "OK", onPress: () => navigation.navigate("DriverDashboard") },
      ]);
    } catch (e: any) {
      Alert.alert("Payment", e?.message || "Failed to mark cash");
    } finally {
      setLoading(false);
    }
  };

  const onPaidTransfer = async () => {
    if (!txId || !token) return;
    try {
      setLoading(true);
      await markPaidTransfer(txId, token);
      Alert.alert("Payment", "Transfer confirmed. Transaction completed.", [
        { text: "OK", onPress: () => navigation.navigate("DriverDashboard") },
      ]);
    } catch (e: any) {
      Alert.alert("Payment", e?.message || "Failed to mark transfer");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator size="large" color="#4A3AFF" />
        <Text style={{ marginTop: 12 }}>Preparing payment…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Collect Payment</Text>
      <Text style={styles.subtitle}>Show this QR to the customer for bank transfer</Text>

      {!!qrUrl && (
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrUrl }} style={styles.qrImg} resizeMode="contain" />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.row}><Text style={styles.label}>Amount:</Text> {amount?.toLocaleString()} VND</Text>
        {!!meta?.vehicle && <Text style={styles.row}><Text style={styles.label}>Vehicle:</Text> {meta.vehicle}</Text>}
        {!!meta?.driverName && <Text style={styles.row}><Text style={styles.label}>Driver:</Text> {meta.driverName}</Text>}
        {typeof meta?.tripLengthKm === 'number' && (
          <Text style={styles.row}><Text style={styles.label}>Trip length:</Text> {meta.tripLengthKm.toFixed(2)} km</Text>
        )}
        {!!meta?.addInfo && <Text style={styles.row}><Text style={styles.label}>Note:</Text> {meta.addInfo}</Text>}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.cashBtn]} onPress={onPaidCash}>
          <Text style={styles.btnText}>Paid by cash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.transferBtn]} onPress={onPaidTransfer}>
          <Text style={styles.btnText}>Mark as received</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#666", marginBottom: 16, textAlign: "center" },
  qrWrap: { width: 280, height: 280, backgroundColor: "#fff", borderRadius: 16, padding: 12, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: 20 },
  qrImg: { width: "100%", height: "100%" },
  card: { width: "100%", backgroundColor: "#f7f7fb", borderRadius: 12, padding: 16, marginTop: 8 },
  row: { fontSize: 16, marginBottom: 8, color: "#222" },
  label: { fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  cashBtn: { backgroundColor: "#FF7A00" },
  transferBtn: { backgroundColor: "#34C759" },
  btnText: { color: "#fff", fontWeight: "700" },
});
