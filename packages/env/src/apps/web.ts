import { cleanEnv, str } from 'envalid';

const validated = cleanEnv(process.env, {
  STATIC_HOSTING_BASE_PATH: str({ default: '/' })
});

export const env = {
  staticHostingBasePath: validated.STATIC_HOSTING_BASE_PATH
} as const;
