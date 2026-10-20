import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import stripe from '@convex-dev/stripe/convex.config.js';
import workflow from '@convex-dev/workflow/convex.config.js';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import betterAuth from './components/better-auth/convex.config';

const app = defineApp({
  env: {
    CONVEX_SITE_URL: v.optional(v.string()),
    STRIPE_SECRET_KEY: v.optional(v.string()),
    STRIPE_WEBHOOK_SECRET: v.optional(v.string()),
    CLOUDFLARE_ACCOUNT_ID: v.optional(v.string()),
    CLOUDFLARE_EMAIL_API_TOKEN: v.optional(v.string()),
    AUTH_EMAIL_FROM: v.optional(v.string()),
    SITE_URL: v.optional(v.string())
  }
});

app.use(betterAuth);
app.use(agent);
app.use(stripe);
app.use(geospatial);
app.use(rateLimiter);
app.use(workflow);

export default app;
