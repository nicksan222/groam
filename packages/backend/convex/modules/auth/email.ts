import { HOUR, RateLimiter } from '@convex-dev/rate-limiter';
import { v } from 'convex/values';
import { components } from '#convex-generated/api';
import { env, internalAction } from '#convex-generated/server';
import { deliverAuthEmail } from './delivery';

/** Public signup, verification, and reset endpoints all mail one address; cap it per recipient. */
export const authEmailRateLimiter = new RateLimiter(components.rateLimiter, {
  authEmail: {
    capacity: 5,
    kind: 'token bucket',
    period: HOUR,
    rate: 5
  }
});

/** Scheduled by Better Auth so email-provider latency cannot enumerate registered accounts. */
export const send = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string()
  },
  returns: v.null(),
  handler: async (_ctx, message) => {
    if (!env.SITE_URL || !env.AUTH_EMAIL_RELAY_SECRET) {
      throw new Error('Authentication email is not configured');
    }
    await deliverAuthEmail(
      { siteUrl: env.SITE_URL, relaySecret: env.AUTH_EMAIL_RELAY_SECRET },
      message
    );
    return null;
  }
});
