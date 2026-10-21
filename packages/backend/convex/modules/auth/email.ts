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
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_EMAIL_API_TOKEN || !env.AUTH_EMAIL_FROM) {
      throw new Error('Authentication email is not configured');
    }
    await deliverAuthEmail(
      {
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_EMAIL_API_TOKEN,
        from: env.AUTH_EMAIL_FROM
      },
      message
    );
    return null;
  }
});
