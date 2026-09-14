import { cleanEnv, num, str, url } from 'envalid';

const validated = cleanEnv(process.env, {
  AI_AGENT_MODELS: str({ default: '' }),
  AI_MODEL: str({ default: '' }),
  AI_PROVIDER: str({ choices: ['openai', 'anthropic', 'google'], default: '' }),
  AI_WEB_SEARCH: str({ choices: ['enabled', 'disabled'], default: '' }),
  ANTHROPIC_API_KEY: str({ default: '' }),
  ANTHROPIC_BASE_URL: str({ default: '' }),
  CONVEX_AGENT_MODE: str({ default: 'anonymous' }),
  GOOGLE_GENERATIVE_AI_API_KEY: str({ default: '' }),
  GOOGLE_GENERATIVE_AI_BASE_URL: str({ default: '' }),
  GROAM_READY_TIMEOUT_SECONDS: num({ default: 0 }),
  GROAM_STARTUP_TIMEOUT_MS: num({ default: 0 }),
  OPENAI_API_KEY: str({ default: '' }),
  OPENAI_API_MODE: str({ choices: ['chat', 'responses'], default: '' }),
  OPENAI_BASE_URL: str({ default: '' }),
  VITE_CONVEX_URL: url({ default: '' })
});

const configuredConvexEnvironment = Object.fromEntries(
  Object.entries({
    AI_AGENT_MODELS: validated.AI_AGENT_MODELS,
    AI_MODEL: validated.AI_MODEL,
    AI_PROVIDER: validated.AI_PROVIDER,
    AI_WEB_SEARCH: validated.AI_WEB_SEARCH,
    ANTHROPIC_API_KEY: validated.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: validated.ANTHROPIC_BASE_URL,
    GOOGLE_GENERATIVE_AI_API_KEY: validated.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_GENERATIVE_AI_BASE_URL: validated.GOOGLE_GENERATIVE_AI_BASE_URL,
    OPENAI_API_KEY: validated.OPENAI_API_KEY,
    OPENAI_API_MODE: validated.OPENAI_API_MODE,
    OPENAI_BASE_URL: validated.OPENAI_BASE_URL
  }).filter((entry): entry is [string, string] => Boolean(entry[1]))
);

export const env = {
  convexAgentMode: validated.CONVEX_AGENT_MODE,
  configuredConvexEnvironment,
  convexUrl: validated.VITE_CONVEX_URL,
  readyTimeoutSeconds: validated.GROAM_READY_TIMEOUT_SECONDS,
  startupTimeoutMs: validated.GROAM_STARTUP_TIMEOUT_MS
} as const;
