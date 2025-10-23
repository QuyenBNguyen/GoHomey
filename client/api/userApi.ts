// src/api/userApi.ts
import axios from "axios";
import Constants from "expo-constants";

const extras =
  (Constants as any).expoConfig?.extra ||
  (Constants as any).manifest?.extra ||
  undefined;

const API_BASE =
  (extras?.API_BASE as string) ||
  (process.env?.API_BASE as string) ||
  "http://192.168.5.107:5000";

export const getUserProfile = async (token: string) => {
  const response = await axios.get(`${API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateUserProfile = async (profileData: any, token: string) => {
  const response = await axios.put(`${API_BASE}/users/profile`, profileData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getUserById = async (userId: string, token: string) => {
  const response = await axios.get(`${API_BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Update a user's current location (live tracking upload)
export const updateUserLocation = async (
  userId: string,
  lat: number,
  lng: number,
  token: string
) => {
  const response = await axios.patch(
    `${API_BASE}/users/${userId}/location`,
    { lat, lng },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
