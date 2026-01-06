import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Keep Link for internal navigation (without locale prefix)
export const { Link } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'never'
});
