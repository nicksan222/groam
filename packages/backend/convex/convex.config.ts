import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import migrations from '@convex-dev/migrations/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import staticHosting from '@convex-dev/static-hosting/convex.config';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import betterAuth from './components/better-auth/convex.config';
import { assistantProviderValidator } from './modules/ai/validators';

const app = defineApp({
  env: {
    AI_AGENT_MODELS: v.optional(v.string()),
    AI_MODEL: v.optional(v.string()),
    AI_PROVIDER: v.optional(assistantProviderValidator),
    AI_WEB_SEARCH: v.optional(v.union(v.literal('enabled'), v.literal('disabled'))),
    ANTHROPIC_API_KEY: v.optional(v.string()),
    ANTHROPIC_BASE_URL: v.optional(v.string()),
    CONVEX_SITE_URL: v.optional(v.string()),
    GOOGLE_GENERATIVE_AI_API_KEY: v.optional(v.string()),
    GOOGLE_GENERATIVE_AI_BASE_URL: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_API_MODE: v.optional(v.union(v.literal('chat'), v.literal('responses'))),
    OPENAI_BASE_URL: v.optional(v.string()),
    SITE_URL: v.optional(v.string())
  }
});

app.use(betterAuth);
app.use(agent);
app.use(geospatial);
app.use(migrations);
app.use(rateLimiter);
app.use(staticHosting, { name: 'web' });

export default app;
