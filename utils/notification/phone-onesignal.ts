// capacitor/capacitor-setup.ts
import OneSignal from 'onesignal-cordova-plugin';

export function initCapacitor() {
    // Enable verbose logging for debugging (remove in production)
    OneSignal.Debug.setLogLevel(6);
    // Initialize with your OneSignal App ID
    OneSignal.initialize(process.env.ONESIGNAL_APP_ID!);
    // Use this method to prompt for push notifications.
    // We recommend removing this method after testing and instead use In-App Messages to prompt for notification permission.
    OneSignal.Notifications.requestPermission(false).then((accepted: boolean) => {
      console.log("User accepted notifications: " + accepted);
    });
}
