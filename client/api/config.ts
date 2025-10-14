import Constants from "expo-constants";

// Prefer API_BASE from Expo config extra (populated via app.config.js + .env)
const extras: any = (Constants as any).expoConfig?.extra || (Constants as any).manifest?.extra || {};

function inferLanFallback(): string {
  // Try to infer LAN IP from Expo hostUri/debuggerHost, e.g. "192.168.1.10:19000"
  const hostUri: string | undefined = (Constants as any).expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip) return `http://${ip}:5000`;
  }
  return "http://localhost:5000";
}

export const API_BASE: string = (extras?.API_BASE as string) || inferLanFallback();

// Helpful during development to verify API base resolution
// eslint-disable-next-line no-console
console.log("API_BASE resolved:", API_BASE);
