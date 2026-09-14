import { bool, cleanEnv } from 'envalid';

const validated = cleanEnv(process.env, {
  CI: bool({ default: false })
});

export const env = {
  isCI: validated.CI
} as const;
