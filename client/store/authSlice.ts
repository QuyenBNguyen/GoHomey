// src/store/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { requestOtp, verifyOtp } from "../api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
};

export const requestOtpForEmail = createAsyncThunk<
  void,
  { email: string; password?: string } | string,
  { rejectValue: string }
>("auth/requestOtpForEmail", async (arg, thunkAPI) => {
  try {
    // support old string param for backward compatibility
    if (typeof arg === "string") {
      await requestOtp(arg as string);
    } else {
      const { email, password } = arg as { email: string; password?: string };
      await requestOtp(email, password);
    }
  } catch (err: any) {
    console.error("Request OTP error:", err.response?.data || err.message);
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to request OTP");
  }
});

export const verifyOtpForEmail = createAsyncThunk<
  { token: string; user: User },
  { email: string; otp: string },
  { rejectValue: string }
>("auth/verifyOtpForEmail", async (payload, thunkAPI) => {
  try {
    const { email, otp } = payload;
    const result = await verifyOtp(email, otp);
    return result;
  } catch (err: any) {
    console.error("Verify OTP error:", err.response?.data || err.message);
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to verify OTP");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.error = null;
      AsyncStorage.removeItem("token");
      AsyncStorage.removeItem("user");
    }
    ,
    // hydrate credentials on app start
    setCredentials(state, action) {
      const { token, user } = action.payload || {};
      state.token = token ?? state.token;
      state.user = user ?? state.user;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtpForEmail.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(requestOtpForEmail.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(requestOtpForEmail.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(verifyOtpForEmail.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verifyOtpForEmail.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        AsyncStorage.setItem("token", action.payload.token);
        AsyncStorage.setItem("user", JSON.stringify(action.payload.user));
      })
      .addCase(verifyOtpForEmail.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;