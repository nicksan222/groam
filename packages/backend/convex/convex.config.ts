import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import staticHosting from '@convex-dev/static-hosting/convex.config';
import workflow from '@convex-dev/workflow/convex.config.js';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import betterAuth from './components/better-auth/convex.config';

const app = defineApp({
  env: {
    CONVEX_SITE_URL: v.optional(v.string()),
    SITE_URL: v.optional(v.string())
  }
});

app.use(betterAuth);
app.use(agent);
app.use(geospatial);
app.use(rateLimiter);
app.use(workflow);
app.use(staticHosting, { name: 'web' });

export default app;
