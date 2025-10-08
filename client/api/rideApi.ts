// src/api/rideApi.ts
import axios from "axios";
const process.env.API_BASE = "http://192.168.5.107:5000/rides"; 

export const getRides = async (token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/rides`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createRide = async (rideData: any, token: string) => {
  const response = await axios.post(`${process.env.API_BASE}/rides`, rideData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getRideById = async (rideId: string, token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/rides/${rideId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateRide = async (rideId: string, updateData: any, token: string) => {
  const response = await axios.put(`${process.env.API_BASE}/rides/${rideId}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteRide = async (rideId: string, token: string) => {
  const response = await axios.delete(`${process.env.API_BASE}/rides/${rideId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
