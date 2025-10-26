// src/api/userApi.ts
import axios from "axios";
import { API_BASE } from "./config";

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
