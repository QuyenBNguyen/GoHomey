import Constants from "expo-constants";

// Prefer API_BASE from Expo config extra (bundled via app.config.js/eas.json)
const extras: any = (Constants as any).expoConfig?.extra || (Constants as any).manifest?.extra || {};

function fallbackByEnvironment(): string {
  // In standalone (APK) we must use the production domain, never LAN/IP.
  const ownership = (Constants as any).appOwnership || (Constants as any).expoConfig?.appOwnership;
  if (ownership === 'standalone' || ownership === 'guest') {
    return 'https://gohomey.me';
  }
  // In dev clients, attempt LAN inference to ease local testing.
  const hostUri: string | undefined = (Constants as any).expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip) return `http://${ip}:5000`;
  }
  return 'https://gohomey.me';
}

export const API_BASE: string = (extras?.API_BASE as string) || fallbackByEnvironment();

// eslint-disable-next-line no-console
console.log("[config] API_BASE:", API_BASE);
