// src/store/locationSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Coordinates,
  HomeLocationData,
  RouteData,
  saveHomeLocationAPI,
  fetchHomeLocationAPI,
  fetchCurrentLocationAPI,
  fetchRouteAPI,
} from "../api/locationAPI";
import axios from "axios";


/* ---------- State types ---------- */
interface LocationState {
  currentLocation: Coordinates | null;
  driverLocation: Coordinates | null;
  homeLocation: HomeLocationData | null;
  routeDriverToCustomer: RouteData | null;
  routeCustomerToHome: RouteData | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  driverLocation: null,
  homeLocation: null,
  routeDriverToCustomer: null,
  routeCustomerToHome: null,
  status: "idle",
  error: null,
};


export const saveHomeLocation = createAsyncThunk<
  HomeLocationData,
  { latitude: number; longitude: number; address?: string },
  { rejectValue: string }
>("location/saveHomeLocation", async (payload, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as any;
    const token: string | undefined = state?.auth?.token;

    if (!token) {
      return thunkAPI.rejectWithValue("Not authenticated");
    }

    // ✅ Call API and return normalized result
    const result = await saveHomeLocationAPI(token, payload);
    return result;

  } catch (err: any) {
    console.error("Save home location error:", err.response?.data || err.message);
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to save location");
  }
});


/**
 * Load home location from backend.
 */
export const loadHomeLocation = createAsyncThunk<
  HomeLocationData | null,
  void,
  { rejectValue: string }
>("location/", async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as any;
    const token: string | undefined = state?.auth?.token;

    if (!token) {
      return thunkAPI.rejectWithValue("Not authenticated");
    }

    const result = await fetchHomeLocationAPI(token);
    return result;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.message ?? "Failed to load home location");
  }
});

/* Current live GPS position (uses Expo Location) */
export const fetchCurrentLocation = createAsyncThunk<
  Coordinates,
  void,
  { rejectValue: string }
>("location/fetchCurrentLocation", async (_, thunkAPI) => {
  try {
    return await fetchCurrentLocationAPI();
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.message ?? "Failed to fetch current location");
  }
});

/* Fetch route between two points */
export const fetchRoute = createAsyncThunk<
  { type: "driverToCustomer" | "customerToHome"; data: RouteData },
  { start: Coordinates; end: Coordinates; type: "driverToCustomer" | "customerToHome" },
  { rejectValue: string }
>("location/fetchRoute", async ({ start, end, type }, thunkAPI) => {
  try {
    const route = await fetchRouteAPI(start, end);
    return { type, data: route };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.message ?? "Failed to fetch route");
  }
});

/* ---------- Slice ---------- */
const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearHomeLocation(state) {
      state.homeLocation = null;
    },
    setDriverLocation(state, action: PayloadAction<Coordinates>) {
      state.driverLocation = action.payload;
    },
    setCurrentLocation(state, action: PayloadAction<Coordinates>) {
      state.currentLocation = action.payload;
    },
    clearRoutes(state) {
      state.routeDriverToCustomer = null;
      state.routeCustomerToHome = null;
    },
  },
  extraReducers: (builder) => {
    // save home
    builder
      .addCase(saveHomeLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(saveHomeLocation.fulfilled, (state, action: PayloadAction<HomeLocationData>) => {
        state.status = "succeeded";
        state.homeLocation = action.payload;
      })
      .addCase(saveHomeLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // load home
    builder
      .addCase(loadHomeLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadHomeLocation.fulfilled, (state, action: PayloadAction<HomeLocationData | null>) => {
        state.status = "succeeded";
        state.homeLocation = action.payload;
      })
      .addCase(loadHomeLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // current location
    builder
      .addCase(fetchCurrentLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentLocation.fulfilled, (state, action: PayloadAction<Coordinates>) => {
        state.status = "succeeded";
        state.currentLocation = action.payload;
      })
      .addCase(fetchCurrentLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // routes
    builder.addCase(fetchRoute.fulfilled, (state, action) => {
      if (action.payload.type === "driverToCustomer") {
        state.routeDriverToCustomer = action.payload.data;
      } else {
        state.routeCustomerToHome = action.payload.data;
      }
    });
  },
});

export const {
  clearError,
  clearHomeLocation,
  setDriverLocation,
  setCurrentLocation,
  clearRoutes,
} = locationSlice.actions;

export default locationSlice.reducer;
