import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from 'better-auth/api';
import { jwtVerify } from 'jose';

type HookContext = Parameters<typeof getAuthoritativeSessionFromCtx>[0];

/** Accounts created before email sign-in hold these addresses; they can never receive mail. */
export const isPlaceholderEmail = (email: string) =>
  email.trim().toLowerCase().endsWith('@users.invalid');

/** Every hosted site requires email ownership; only local development skips it. */
export function requiresVerifiedEmail(siteUrl: string) {
  return !new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(siteUrl).hostname);
}

/** The signed-in session, including the cross-domain cookie Better Auth applies only after before hooks. */
async function currentSession(ctx: HookContext) {
  const forwardedCookie = ctx.headers?.get('better-auth-cookie');
  if (forwardedCookie && !ctx.headers?.has('authorization')) {
    ctx.headers = new Headers(ctx.headers);
    ctx.headers.set('cookie', forwardedCookie);
  }
  return await getAuthoritativeSessionFromCtx(ctx);
}

/** Email changes need a sign-in within Better Auth's `freshAge`, which `/change-email` skips. */
function requireFreshSession(ctx: HookContext, createdAt: Date) {
  const { freshAge } = ctx.context.sessionConfig;
  if (freshAge !== 0 && Date.now() - new Date(createdAt).getTime() >= freshAge * 1000) {
    throw new APIError('FORBIDDEN', { message: 'Sign in again before changing your email.' });
  }
}

/** Reject unreachable addresses and bind email changes to the fresh originating session. */
export function emailVerificationPolicy() {
  return {
    id: 'groam-email-verification-policy',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-up/email' || ctx.path === '/change-email',
          handler: createAuthMiddleware(async (ctx) => {
            const email = ctx.body?.newEmail ?? ctx.body?.email;
            if (typeof email === 'string' && isPlaceholderEmail(email)) {
              throw new APIError('BAD_REQUEST', {
                message: 'Use an email address you can receive mail at.'
              });
            }
            if (ctx.path !== '/change-email') return;
            // Better Auth rejects the missing session itself.
            const session = await currentSession(ctx);
            if (session) requireFreshSession(ctx, session.session.createdAt);
          })
        },
        {
          matcher: (ctx) => ctx.path === '/verify-email',
          handler: createAuthMiddleware(async (ctx) => {
            let payload;
            try {
              ({ payload } = await jwtVerify(
                String(ctx.query?.token),
                new TextEncoder().encode(ctx.context.secret),
                { algorithms: ['HS256'] }
              ));
            } catch {
              // Better Auth owns ordinary invalid/expired-token responses and safe redirects.
              return;
            }
            if (!payload.updateTo) return;
            const session = await currentSession(ctx);
            if (session?.user.email === payload.updateTo) return ctx.json({ status: true });
            if (!session || session.user.email !== payload.email) {
              throw new APIError('UNAUTHORIZED', {
                message:
                  'Sign in to the account that requested this email change, then reopen the link.'
              });
            }
            requireFreshSession(ctx, session.session.createdAt);
          })
        }
      ]
    }
  } satisfies BetterAuthPlugin;
}
