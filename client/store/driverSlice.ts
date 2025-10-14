import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as driverApi from "../api/driverApi";

// Async thunks for dashboard data
export const fetchDriverProfile = createAsyncThunk(
  "driver/fetchProfile",
  async ({ driverId, token }: { driverId: string; token: string }, thunkAPI) => {
    return await driverApi.getDriverProfile(driverId, token);
  }
);

export const fetchDriverDailySummary = createAsyncThunk(
  "driver/fetchDailySummary",
  async ({ driverId, token }: { driverId: string; token: string }, thunkAPI) => {
    return await driverApi.getDriverDailySummary(driverId, token);
  }
);

export interface DriverDailySummary {
  totalRides: number;
  totalEarnings: number;
  rating: number | null;
  ratingCount: number;
}

const initialState: {
  profile: any;
  dailySummary: DriverDailySummary | null;
  loading: boolean;
  error: string | null;
} = {
  profile: null,
  dailySummary: null,
  loading: false,
  error: null,
};

const driverSlice = createSlice({
  name: "driver",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDriverProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriverProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchDriverProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? null;
      })
      .addCase(fetchDriverDailySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriverDailySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.dailySummary = action.payload;
      })
      .addCase(fetchDriverDailySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? null;
      });
  },
});

export default driverSlice.reducer;
