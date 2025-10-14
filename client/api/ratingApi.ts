// src/api/ratingApi.ts
import axios from "axios";
import Constants from "expo-constants";
const base =
  ((Constants as any).expoConfig?.extra?.API_BASE as string) ||
  ((Constants as any).manifest?.extra?.API_BASE as string) ||
  (process.env.API_BASE as string) ||
  "http://192.168.5.107:5000";
const RATINGS_BASE = `${base}/ratings`;

export const getRatingsForRide = async (rideId: string, token: string) => {
  const response = await axios.get(`${RATINGS_BASE}/rides/${rideId}/ratings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const addRating = async (rideId: string, ratingData: any, token: string) => {
  const response = await axios.post(`${RATINGS_BASE}/rides/${rideId}/ratings`, ratingData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
