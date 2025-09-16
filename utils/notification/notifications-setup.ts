// utils/notification/notification-setup.ts
import { runOneSignal } from "./web-onesignal";
import { initCapacitor } from "./phone-onesignal";

export async function setupNotification() {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");

    if (Capacitor.isNativePlatform()) {
      // 📱 Native app (iOS/Android via Capacitor)
      console.log("[Notification] Running Capacitor OneSignal");
      initCapacitor();
    } else {
      // 🌐 Web / PWA
      console.log("[Notification] Running Web OneSignal");
      runOneSignal();
    }
  } catch (err) {
    console.error("[Notification] Setup failed:", err);
  }
}
