import { bool, cleanEnv, url } from 'envalid';

const validated = cleanEnv(process.env, {
  CI: bool({ default: false }),
  PLAYWRIGHT_BASE_URL: url({
    default: process.env.VITE_CONVEX_SITE_URL ?? 'http://127.0.0.1:3211'
  }),
  VITE_CONVEX_SITE_URL: url({ default: 'http://127.0.0.1:3211' }),
  VITE_CONVEX_URL: url({ default: 'http://127.0.0.1:3210' })
});

export const env = {
  baseUrl: validated.PLAYWRIGHT_BASE_URL,
  convexSiteUrl: validated.VITE_CONVEX_SITE_URL,
  convexUrl: validated.VITE_CONVEX_URL,
  isCI: validated.CI
} as const;
