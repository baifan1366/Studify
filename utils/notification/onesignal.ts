import OneSignal from "react-onesignal";

export async function runOneSignal() {
  await OneSignal.init({
    appId: "17d463cb-479b-47a7-881b-51011b46f4ba", // replace with your real App ID
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

