import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'], // Add your supported locales
  defaultLocale: 'en'
});
