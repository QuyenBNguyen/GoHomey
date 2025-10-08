// src/api/driverApi.ts
import axios from "axios";
const process.env.API_BASE = "http://192.168.5.107:5000/drivers"; 

export const getDrivers = async (token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getDriverById = async (driverId: string, token: string) => {
  const response = await axios.get(`${process.env.API_BASE}/drivers/${driverId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateDriver = async (driverId: string, updateData: any, token: string) => {
  const response = await axios.put(`${process.env.API_BASE}/drivers/${driverId}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
