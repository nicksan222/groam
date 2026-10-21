import { v } from 'convex/values';
import { env, internalAction } from '#convex-generated/server';
import { deliverAuthEmail } from './delivery';

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
