import { HomeLocationData } from "./../api/locationAPI";
export type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  Register: {email: string; password:string }; // added Register route
  PhoneLogin: undefined;
  Home: undefined;
  VerifyCode: { email: string , password?: string}; // added password param
  Map: {homeLocation: HomeLocationData}; // ✅ expect homeLocation param
  HomeLocationSetup:undefined;
  Profile: undefined;
  Settings: undefined;
  DriverFound: undefined;
  FindingDriver: undefined;
  DriverDashboard: undefined;
  Splash: undefined;
};
