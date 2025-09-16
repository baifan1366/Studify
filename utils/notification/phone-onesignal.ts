// capacitor/capacitor-setup.ts

export async function initCapacitor() {
    try {
        // Dynamic import to avoid server-side execution
        const OneSignal = (await import('onesignal-cordova-plugin')).default;
        
        // Enable verbose logging for debugging (remove in production)
        OneSignal.Debug.setLogLevel(6);
        // Initialize with your OneSignal App ID
        OneSignal.initialize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!);
        // Use this method to prompt for push notifications.
        // We recommend removing this method after testing and instead use In-App Messages to prompt for notification permission.
        OneSignal.Notifications.requestPermission(false).then((accepted: boolean) => {
          console.log("User accepted notifications: " + accepted);
        });
    } catch (error) {
        console.error("Failed to initialize OneSignal Cordova:", error);
    }
}
