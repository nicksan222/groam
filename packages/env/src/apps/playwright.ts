import { bool, cleanEnv, email, str, url } from 'envalid';

const validated = cleanEnv(process.env, {
  CI: bool({ default: false }),
  PLAYWRIGHT_BASE_URL: url({
    default: process.env.VITE_CONVEX_SITE_URL ?? 'http://127.0.0.1:3211'
  }),
  SEED_USER_EMAIL: email({ default: 'demo@groam.example' }),
  SEED_USER_PASSWORD: str({ default: 'GroamDemo123!' })
});

export const env = {
  baseUrl: validated.PLAYWRIGHT_BASE_URL,
  isCI: validated.CI,
  userEmail: validated.SEED_USER_EMAIL,
  userPassword: validated.SEED_USER_PASSWORD
} as const;
