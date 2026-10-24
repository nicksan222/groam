import agent from '@convex-dev/agent/convex.config';
import geospatial from '@convex-dev/geospatial/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import resend from '@convex-dev/resend/convex.config.js';
import staticHosting from '@convex-dev/static-hosting/convex.config.js';
import workflow from '@convex-dev/workflow/convex.config.js';
import { schemaFor } from '@groam/env/deployment';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import betterAuth from './components/better-auth/convex.config';

const app = defineApp({
  // Optional here: the release preflight checks hosted deployments set the ones they need.
  env: {
    CONVEX_SITE_URL: v.optional(v.string()),
    ...schemaFor('convex', () => v.optional(v.string()))
  }
});

app.use(betterAuth);
app.use(agent);
app.use(geospatial);
app.use(rateLimiter);
app.use(resend);
app.use(workflow);
// The two frontends. The app owns HTTP routing (no httpPrefix), so auth, webhook and OAuth
// callback URLs stay where they are and only fall through to these catch-alls in http.ts.
app.use(staticHosting, { name: 'landing' });
app.use(staticHosting, { name: 'web' });

export default app;
