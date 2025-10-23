import Constants from "expo-constants";

const extras = (Constants as any).expoConfig?.extra || (Constants as any).manifest?.extra || {};
const API_BASE = (extras?.API_BASE as string) || (process.env.API_BASE as string) || "http://192.168.5.107:5000";

export async function createVnpayUrl(rideId: string, token: string): Promise<{ url: string; orderId: string }> {
  const res = await fetch(`${API_BASE}/payments/vnpay/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rideId }),
  });
  if (!res.ok) throw new Error("Failed to create VNPay URL");
  return res.json();
}

export async function getTransactionStatus(orderId: string, token: string) {
  const res = await fetch(`${API_BASE}/payments/transactions/${orderId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch transaction status");
  return res.json();
}
