import OneSignal from "react-onesignal";

export async function runOneSignal() {
  await OneSignal.init({
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
    serviceWorkerPath: '/OneSignalSDKWorker.js',
    serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
    serviceWorkerParam: { scope: '/' }
  });

  // 🔹 Ask browser permission with OneSignal’s default prompt
  OneSignal.Slidedown.promptPush();

  // 🔹 Optional: log Player ID when subscribed
  OneSignal.User.PushSubscription.addEventListener("change", async (event) => {
    if (event.current.id) {
      console.log("User subscribed with Player ID:", event.current.id);
    }
  });
}

