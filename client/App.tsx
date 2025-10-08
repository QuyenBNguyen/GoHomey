import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider } from "react-redux";
import { store } from "./store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { setCredentials } from "./store/authSlice";
import LoginScreen from "./screens/LoginScreen";
import EmailLoginScreen from "./screens/EmailLoginScreen";
import { RootStackParamList } from "./navigation/navigation";
import PhoneLoginScreen from "./screens/PhoneLoginScreen";
import VerifyCodeScreen from "./screens/VerifyCodeScreen";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import FindingDriverScreen from "./screens/FindingDriverScreen";
import DriverFoundScreen from "./screens/DriverFoundScreen";
import DriverDashboard from "./screens/admin/DriverDashboard";
import HomeLocationSetupScreen from "./screens/HomeLocationSetupScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Splash from "./components/Splash";
import RegisterScreen from "./screens/RegisterScreen";
import { useState } from "react";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // hydrate auth from AsyncStorage on app start
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userRaw = await AsyncStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (token) {
          // set axios default header
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          // populate redux
          store.dispatch(setCredentials({ token, user }));
        }
      } catch (err) {
        console.error("Failed to hydrate auth", err);
      }
    })();
    return () => { active = false };
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showSplash ? (
            <Stack.Screen name="Splash">
              {() => <Splash onFinish={() => setShowSplash(false)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
              <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="HomeLocationSetup" component={HomeLocationSetupScreen} />
              <Stack.Screen name="Map" component={MapScreen} />
              <Stack.Screen name="FindingDriver" component={FindingDriverScreen} />
              <Stack.Screen name="DriverFound" component={DriverFoundScreen} />
              <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
