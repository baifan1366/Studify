// utils/notification/notification-setup.ts
import { runOneSignal } from "./web-onesignal";
import { initCapacitor } from "./phone-onesignal";

export async function setupNotification() {
  if (typeof window === "undefined") return;

  // 🚫 Skip notifications in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("[Notification] Skipping OneSignal setup in development mode");
    return;
  }

  // 🚫 Skip if no OneSignal App ID is configured
  if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
    console.log("[Notification] OneSignal App ID not configured, skipping setup");
    return;
  }

  try {
    const { Capacitor } = await import("@capacitor/core");

    if (Capacitor.isNativePlatform()) {
      // 📱 Native app (iOS/Android via Capacitor)
      console.log("[Notification] Running Capacitor OneSignal");
      await initCapacitor();
    } else {
      // 🌐 Web / PWA
      console.log("[Notification] Running Web OneSignal");
      runOneSignal();
    }
  } catch (err) {
    console.error("[Notification] Setup failed:", err);
    // Don't throw the error, just log it
  }
}
