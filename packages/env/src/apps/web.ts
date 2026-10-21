import { cleanEnv, str } from 'envalid';

const validated = cleanEnv(process.env, {
  WEB_BASE_PATH: str({ default: '/' })
});

export const env = {
  basePath: validated.WEB_BASE_PATH
} as const;
