import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import DriverDashboard from "../screens/admin/DriverDashboard";
import DriverRidesScreen from "../screens/admin/DriverRidesScreen";
import DriverVehiclesScreen from "../screens/admin/DriverVehiclesScreen";

export type DriverDrawerParamList = {
  Dashboard: undefined;
  Rides: undefined;
  Vehicles: undefined;
};

const Drawer = createDrawerNavigator<DriverDrawerParamList>();

export default function DriverDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#4A3AFF", // Vibrant purple
          width: 280,
        },
        drawerActiveBackgroundColor: "#fff",
        drawerActiveTintColor: "#4A3AFF",
        drawerInactiveTintColor: "#fff",
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: "600",
          marginLeft: -20,
        },
        drawerItemStyle: {
          borderRadius: 14,
          marginHorizontal: 12,
          marginVertical: 6,
        },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DriverDashboard}
        options={{
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "speedometer" : "speedometer-outline"} size={size} color={color} />
          ),
          drawerLabel: "Dashboard",
        }}
      />
      <Drawer.Screen
        name="Rides"
        component={DriverRidesScreen}
        options={{
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "car" : "car-outline"} size={size} color={color} />
          ),
          drawerLabel: "Rides",
        }}
      />
      <Drawer.Screen
        name="Vehicles"
        component={DriverVehiclesScreen}
        options={{
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "car-sport" : "car-sport-outline"} size={size} color={color} />
          ),
          drawerLabel: "Vehicles",
        }}
      />
    </Drawer.Navigator>
  );
}
