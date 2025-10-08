// src/api/authAPI.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Resolve runtime config from both manifest and expoConfig (EAS)
const extras =
  (Constants as any).manifest?.extra ||
  (Constants as any).expoConfig?.extra ||
  undefined;

const API_BASE =
  (extras?.API_BASE as string) ||
  (process.env?.API_BASE as string) ||
  "http://10.12.49.1:5000"; // <-- change to your dev server IP if needed

// create axios instance with timeout so client fails fast instead of hanging
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10s - fail faster in dev
});

// Debug: log resolved API_BASE at runtime so dev can confirm which address the app uses
console.log("authApi: resolved API_BASE =", API_BASE);

// helper to set auth header after login
export const setAuthToken = (token?: string) => {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
};

// Allow optional password to be sent with email (server requires password if account has one)
export const requestOtp = async (email: string, password?: string) => {
  if (!API_BASE) throw new Error("API_BASE is not configured. See client/.env or client/app.json");
  console.log("authApi.requestOtp ->", { email, password: password ? "[REDACTED]" : undefined });
  return api.post("/auth/request-otp", { email, password });
};

export const verifyOtp = async (email: string, otp: string) => {
  try {
    if (!API_BASE) throw new Error("API_BASE is not configured. See client/.env or client/app.json");
    const response = await api.post("/auth/verify-otp", { email, otp });
    const { token, user } = response.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    setAuthToken(token);
    console.log("OTP verified, user logged in:", user.email);
    return { token, user };
  } catch (err: any) {
    console.error("Verify OTP error:", err.response?.data || err.message);
    throw err;
  }
};

export const register = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  gender?: string;
  dob?: string;
}) => {
  if (!API_BASE) throw new Error("API_BASE is not configured. See client/.env or client/app.json");
  return api.post("/auth/register", payload);
};

