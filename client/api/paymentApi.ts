import { API_BASE } from "./config";

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
