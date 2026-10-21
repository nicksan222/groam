import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import stripe from '@convex-dev/stripe/convex.config.js';
import workflow from '@convex-dev/workflow/convex.config.js';
import { schemaFor } from '@groam/env/deployment';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import betterAuth from './components/better-auth/convex.config';

const app = defineApp({
  // Deployment variables come from @groam/env/deployment; the release preflight checks that
  // hosted deployments set the ones they need, so code still treats them as optional.
  env: {
    CONVEX_SITE_URL: v.optional(v.string()),
    ...schemaFor('convex', () => v.optional(v.string()))
  }
});

app.use(betterAuth);
app.use(agent);
app.use(stripe);
app.use(geospatial);
app.use(rateLimiter);
app.use(workflow);

export default app;
