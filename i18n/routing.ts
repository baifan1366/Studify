import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "my"], // Add your supported locales
  defaultLocale: "en",
  localePrefix: "always",
  pathnames: {
    // Exclude service workers from locale routing
    "/sw.js": "/sw.js",
    "/OneSignalSDKWorker.js": "/OneSignalSDKWorker.js",
  },
});
