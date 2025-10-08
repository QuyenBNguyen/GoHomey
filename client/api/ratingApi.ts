// src/api/ratingApi.ts
import axios from "axios";
const process.env.API_BASE = "http://192.168.5.107:5000/ratings"; 

export const getRatingsForRide = async (rideId: string, token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/rides/${rideId}/ratings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const addRating = async (rideId: string, ratingData: any, token: string) => {
  const response = await axios.post(`${process.env.API_BASE}/rides/${rideId}/ratings`, ratingData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
