import { defineEnv, string } from 'void/env';

// Worker server values. Set production values with `void secret put <NAME>`; local development
// reads apps/web/.env (tooling/devkit/configure-auth.ts writes it).
export default defineEnv({
  /** Shared with Convex (`AUTH_EMAIL_RELAY_SECRET`): only Convex may ask the Worker to send mail. */
  AUTH_EMAIL_RELAY_SECRET: string()
});
