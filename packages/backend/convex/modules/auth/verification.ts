import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from 'better-auth/api';
import { jwtVerify } from 'jose';
import { env } from '#convex-generated/server';
import { resolveAuthSiteUrl } from './site';

type HookContext = Parameters<typeof getAuthoritativeSessionFromCtx>[0];

/** Accounts created before email sign-in hold these addresses; they can never receive mail. */
export const isPlaceholderEmail = (email: string) =>
  email.trim().toLowerCase().endsWith('@users.invalid');

/** Whether the site is hosted: anything but local development. */
export function isHostedSite(siteUrl: string) {
  return !new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(siteUrl).hostname);
}

/**
 * Whether authentication email can actually be delivered. Resend is optional: without
 * `RESEND_API_KEY` nothing is sent, so nothing that depends on a mailed link can work. The one
 * place that decides it; read per call so a key set later takes effect without a code change.
 */
export function canSendEmail() {
  return Boolean(env.RESEND_API_KEY);
}

/**
 * Email ownership is required only when the site is hosted and mail can be delivered. A hosted
 * deployment without a key must stay usable, so sign-up and sign-in skip verification there.
 */
export function requiresVerifiedEmail(siteUrl: string) {
  return isHostedSite(siteUrl) && canSendEmail();
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

/** Endpoints whose result is a mailed link: reset, verification resend, and email change. */
const mailDependentPaths = new Set([
  '/request-password-reset',
  '/send-verification-email',
  '/change-email'
]);

/** Reject unreachable addresses and bind email changes to the fresh originating session. */
export function emailVerificationPolicy() {
  return {
    id: 'groam-email-verification-policy',
    hooks: {
      before: [
        {
          // Without a key a hosted deployment mails nothing: fail clearly instead of promising a link.
          matcher: (ctx) => ctx.path !== undefined && mailDependentPaths.has(ctx.path),
          handler: createAuthMiddleware(async () => {
            if (isHostedSite(resolveAuthSiteUrl()) && !canSendEmail()) {
              throw new APIError('SERVICE_UNAVAILABLE', {
                message: 'Email is not available on this deployment.'
              });
            }
          })
        },
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
