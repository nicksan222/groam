import { cleanEnv, num, str, url } from 'envalid';

const validated = cleanEnv(process.env, {
  CONVEX_AGENT_MODE: str({ default: 'anonymous' }),
  GROAM_READY_TIMEOUT_SECONDS: num({ default: 0 }),
  GROAM_STARTUP_TIMEOUT_MS: num({ default: 0 }),
  VITE_CONVEX_URL: url({ default: '' })
});

export const env = {
  convexAgentMode: validated.CONVEX_AGENT_MODE,
  convexUrl: validated.VITE_CONVEX_URL,
  readyTimeoutSeconds: validated.GROAM_READY_TIMEOUT_SECONDS,
  startupTimeoutMs: validated.GROAM_STARTUP_TIMEOUT_MS
} as const;
