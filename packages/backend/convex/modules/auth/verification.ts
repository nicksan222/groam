import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** Accounts created before email sign-in hold these addresses; they can never receive mail. */
export const isPlaceholderEmail = (email: string) =>
  email.trim().toLowerCase().endsWith('@users.invalid');

/** Every hosted site requires email ownership; only local development skips it. */
export function requiresVerifiedEmail(siteUrl: string) {
  return !new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(siteUrl).hostname);
}

/** Reject signup addresses that cannot receive verification mail. */
export function emailVerificationPolicy() {
  return {
    id: 'groam-email-verification-policy',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-up/email',
          handler: createAuthMiddleware(async (ctx) => {
            const email = ctx.body?.email;
            if (typeof email === 'string' && isPlaceholderEmail(email)) {
              throw new APIError('BAD_REQUEST', {
                message: 'Use an email address you can receive mail at.'
              });
            }
          })
        }
      ]
    }
  } satisfies BetterAuthPlugin;
}
