import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "my"], // Add your supported locales
  defaultLocale: "en",
  localePrefix: "always",
});
