import { bool, cleanEnv, url } from 'envalid';

const validated = cleanEnv(process.env, {
  CI: bool({ default: false }),
  VITE_CONVEX_SITE_URL: url({ default: 'http://127.0.0.1:3211' }),
  VITE_CONVEX_URL: url({ default: 'http://127.0.0.1:3210' })
});

export const env = {
  convexSiteUrl: validated.VITE_CONVEX_SITE_URL,
  convexUrl: validated.VITE_CONVEX_URL,
  isCI: validated.CI
} as const;
