import { bool, cleanEnv, num, str, url } from 'envalid';

const dataDirIsExplicit = Boolean(process.env.GROAM_DATA_DIR);

const validated = cleanEnv(process.env, {
  CONVEX_AGENT_MODE: str({ default: 'anonymous' }),
  GROAM_CONVEX_URL: url({ default: 'http://127.0.0.1:3210' }),
  GROAM_DATA_DIR: str({ default: '/data' }),
  GROAM_REPLACE_CONVEX_DIR: bool({ default: false }),
  GROAM_SITE_ORIGIN: url({ default: 'http://127.0.0.1:3211' }),
  GROAM_STARTUP_TIMEOUT_MS: num({ default: 180_000 })
});

export const env = {
  convexAgentMode: validated.CONVEX_AGENT_MODE,
  convexUrl: validated.GROAM_CONVEX_URL,
  dataDir: validated.GROAM_DATA_DIR,
  dataDirIsExplicit,
  replaceConvexDir: validated.GROAM_REPLACE_CONVEX_DIR,
  siteOrigin: validated.GROAM_SITE_ORIGIN,
  siteUrl: validated.GROAM_SITE_ORIGIN.replace(/\/$/u, ''),
  startupTimeoutMs: validated.GROAM_STARTUP_TIMEOUT_MS
} as const;
