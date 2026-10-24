import { HOUR, RateLimiter } from '@convex-dev/rate-limiter';
import { type EmailId, Resend } from '@convex-dev/resend';
import { v } from 'convex/values';
import { components } from '#convex-generated/api';
import { env, internalMutation } from '#convex-generated/server';
import { resolveAuthSiteUrl } from './site';
import { requiresVerifiedEmail } from './verification';

/** Public signup, verification, and reset endpoints all mail one address; cap it per recipient. */
export const authEmailRateLimiter = new RateLimiter(components.rateLimiter, {
  authEmail: {
    capacity: 5,
    kind: 'token bucket',
    period: HOUR,
    rate: 5
  }
});

/** Sender used when the release has not set `AUTH_EMAIL_FROM`: Resend's shared test address. */
export const DEFAULT_AUTH_EMAIL_FROM = 'Groam <onboarding@resend.dev>';

export type AuthEmail = { to: string; subject: string; text: string };

/**
 * With `RESEND_API_KEY` the message is queued on the Resend component, which batches, retries, and
 * dedupes it; the result is the component's email id. Without a key nothing is sent: the message is
 * written to the Convex function log so local development can read verification and reset links
 * there, and the result is null. Errors never carry the key or the message, which holds a one-time
 * link.
 */
export async function queueAuthEmail(
  ctx: Parameters<Resend['sendEmail']>[0],
  message: AuthEmail
): Promise<EmailId | null> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    // Only local sites may print the text: on a hosted deployment the log would hold working links.
    if (requiresVerifiedEmail(resolveAuthSiteUrl())) {
      console.error(
        `Authentication email is not configured (set RESEND_API_KEY), so it was not sent. Recipient domain: ${message.to.split('@').pop()}. Subject: ${message.subject}`
      );
    } else {
      console.info(
        `Authentication email (RESEND_API_KEY is not set, so it was not sent)\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`
      );
    }
    return null;
  }
  // Real recipients need `testMode: false`; the component defaults to Resend's sandbox addresses.
  const resend = new Resend(components.resend, { apiKey, testMode: false });
  try {
    return await resend.sendEmail(ctx, {
      from: env.AUTH_EMAIL_FROM || DEFAULT_AUTH_EMAIL_FROM,
      ...message
    });
  } catch (error) {
    // The component's message names the failure; it never holds the key or the message body.
    console.error(
      'Authentication email could not be queued:',
      error instanceof Error ? error.message : 'unknown error'
    );
    throw new Error('Authentication email could not be queued');
  }
}

/** Delete finalized emails after a week; abandoned ones usually mean a bug, so they stay longer. */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupResend = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
      olderThan: ONE_WEEK_MS
    });
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupAbandonedEmails, {
      olderThan: 4 * ONE_WEEK_MS
    });
    return null;
  }
});

/** Scheduled by Better Auth so email-provider latency cannot enumerate registered accounts. */
export const send = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string()
  },
  returns: v.null(),
  handler: async (ctx, message) => {
    await queueAuthEmail(ctx, message);
    return null;
  }
});
