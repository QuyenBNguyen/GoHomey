import { configureStore } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import authReducer from "./authSlice";
import locationReducer from "./locationSlice";
import driverReducer from "./driverSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    driver: driverReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // allows AsyncStorage JSON objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
