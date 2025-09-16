import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.studify.platform.vercel.app",
  appName: "Studify",
  webDir: "empty",
  server: {
    url: "https://studify-platform.vercel.app",
    cleartext: true,
  },
  ios: {
    handleApplicationNotifications: false
  }
};
export default config;
