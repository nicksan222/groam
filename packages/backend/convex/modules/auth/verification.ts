import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from 'better-auth/api';
import { decodeJwt, jwtVerify } from 'jose';

const isPlaceholder = (email: string) => email.toLowerCase().endsWith('@users.invalid');

/** Only pre-rollout records can be grandfathered; public inputs never control this marker. */
export function emailVerificationPolicy() {
  return {
    id: 'groam-email-verification-policy',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-up/email' || ctx.path === '/change-email',
          handler: createAuthMiddleware(async (ctx) => {
            const email = ctx.body?.newEmail ?? ctx.body?.email;
            if (typeof email === 'string' && isPlaceholder(email.trim())) {
              throw new APIError('BAD_REQUEST', {
                message: 'Use an email address you can receive mail at.'
              });
            }
          })
        },
        {
          matcher: (ctx) => ctx.path === '/sign-in/email' || ctx.path === '/sign-in/username',
          handler: createAuthMiddleware(async (ctx) => {
            const field = ctx.path === '/sign-in/username' ? 'username' : 'email';
            const identifier = ctx.body?.[field];
            if (typeof identifier !== 'string') return;
            const user = await ctx.context.adapter.findOne<{
              email: string;
              emailVerificationRequired?: boolean | null;
            }>({
              model: 'user',
              where: [{ field, value: identifier.trim().toLowerCase() }]
            });
            if (!user || user.emailVerificationRequired === true || !isPlaceholder(user.email))
              return;
            // Every HTTP request gets its own Better Auth instance; never mutate shared options.
            if (ctx.context.options.emailAndPassword)
              ctx.context.options.emailAndPassword.requireEmailVerification = false;
          })
        },
        {
          matcher: (ctx) => ctx.path === '/verify-email',
          handler: createAuthMiddleware(async (ctx) => {
            const token = ctx.query?.token;
            if (typeof token !== 'string') return;
            let payload;
            try {
              ({ payload } = await jwtVerify(token, new TextEncoder().encode(ctx.context.secret), {
                algorithms: ['HS256']
              }));
            } catch {
              // Better Auth owns ordinary invalid/expired-token responses and safe redirects.
              return;
            }
            if (!payload.updateTo) return;
            // Better Auth applies returned transport-hook headers only after all before hooks.
            // Normalize the browser transport here before the authoritative signed-cookie read.
            const forwardedCookie = ctx.headers?.get('better-auth-cookie');
            if (forwardedCookie && !ctx.headers?.has('authorization')) {
              ctx.headers = new Headers(ctx.headers);
              ctx.headers.set('cookie', forwardedCookie);
            }
            const session = await getAuthoritativeSessionFromCtx(ctx);
            if (!session || session.user.email !== payload.email) {
              throw new APIError('UNAUTHORIZED', {
                message:
                  'Sign in to the account that requested this email change, then reopen the link.'
              });
            }
            const age = Date.now() - new Date(session.session.createdAt).getTime();
            const freshAge = ctx.context.sessionConfig.freshAge;
            if (freshAge !== 0 && age >= freshAge * 1000) {
              throw new APIError('FORBIDDEN', {
                message: 'Sign in again before confirming this email change.'
              });
            }
          })
        }
      ]
    }
  } satisfies BetterAuthPlugin;
}

/** Change-email links return through the frontend so its authenticated transport can verify. */
export function verificationLink(url: string, token: string, siteUrl: string) {
  if (!decodeJwt(token).updateTo) return url;
  const target = new URL(new URL(url).searchParams.get('callbackURL') ?? '/', siteUrl);
  if (target.origin !== new URL(siteUrl).origin)
    throw new Error('Invalid verification callback origin');
  target.searchParams.set('emailChangeToken', token);
  return target.href;
}
