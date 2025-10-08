// src/api/userApi.ts
import axios from "axios";

export const getUserProfile = async (token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateUserProfile = async (profileData: any, token: string) => {
  const response = await axios.put(`${process.env.API_BASE}/users/profile`, profileData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getUserById = async (userId: string, token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
