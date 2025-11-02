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

// VietQR APIs
export async function createVietqr(rideId: string, token: string): Promise<{
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  qrUrl: string;
  meta: { vehicle?: string; driverName?: string; tripLengthKm?: number; addInfo?: string; bankBin?: string; accountNo?: string; accountName?: string };
}> {
  const res = await fetch(`${API_BASE}/payments/vietqr/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rideId }),
  });
  if (!res.ok) throw new Error("Failed to create VietQR");
  return res.json();
}

export async function getTransactionById(id: string, token: string) {
  const res = await fetch(`${API_BASE}/payments/transactions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch transaction");
  return res.json();
}

export async function markPaidCash(id: string, token: string) {
  const res = await fetch(`${API_BASE}/payments/transactions/${id}/paid-cash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to mark cash");
  return res.json();
}

export async function markPaidTransfer(id: string, token: string) {
  const res = await fetch(`${API_BASE}/payments/transactions/${id}/paid-transfer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to mark transfer");
  return res.json();
}
