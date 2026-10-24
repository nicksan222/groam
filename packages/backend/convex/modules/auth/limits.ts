import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { MAX_PASSKEY_NAME_LENGTH, MAX_USER_NAME_LENGTH } from '#convex/modules/auth/lengths';
import { MAX_ORGANIZATION_NAME_LENGTH } from '#convex/modules/organizations/lengths';

type Limit = { label: string; maximum: number; read: (ctx: HookContext) => unknown };
export type HookContext = {
  body?: Record<string, unknown> & { data?: Record<string, unknown> };
  query?: Record<string, unknown>;
};

/** Better Auth owns these writes, so their name lengths are enforced on its endpoints. */
const limitsByPath: Record<string, Limit[]> = {
  '/organization/create': [
    { label: 'Group name', maximum: MAX_ORGANIZATION_NAME_LENGTH, read: (ctx) => ctx.body?.name }
  ],
  '/organization/update': [
    {
      label: 'Group name',
      maximum: MAX_ORGANIZATION_NAME_LENGTH,
      read: (ctx) => ctx.body?.data?.name
    }
  ],
  '/passkey/generate-register-options': [
    { label: 'Passkey name', maximum: MAX_PASSKEY_NAME_LENGTH, read: (ctx) => ctx.query?.name }
  ],
  '/passkey/update-passkey': [
    { label: 'Passkey name', maximum: MAX_PASSKEY_NAME_LENGTH, read: (ctx) => ctx.body?.name }
  ],
  '/passkey/verify-registration': [
    { label: 'Passkey name', maximum: MAX_PASSKEY_NAME_LENGTH, read: (ctx) => ctx.body?.name }
  ],
  '/sign-up/email': [
    { label: 'Display name', maximum: MAX_USER_NAME_LENGTH, read: (ctx) => ctx.body?.name }
  ],
  '/update-user': [
    { label: 'Display name', maximum: MAX_USER_NAME_LENGTH, read: (ctx) => ctx.body?.name }
  ]
};

/** The message for the first over-long name in a Better Auth request, or null when all fit. */
export function lengthViolation(path: string | undefined, ctx: HookContext): null | string {
  for (const { label, maximum, read } of (path && limitsByPath[path]) || []) {
    const value = read(ctx);
    if (typeof value === 'string' && value.trim().length > maximum)
      return `${label} must be ${maximum} characters or fewer.`;
  }
  return null;
}

/** Reject over-long profile, group, and passkey names before Better Auth stores them. */
export function fieldLimitsPolicy() {
  return {
    id: 'groam-limits',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path !== undefined && ctx.path in limitsByPath,
          handler: createAuthMiddleware(async (ctx) => {
            const message = lengthViolation(ctx.path, ctx);
            if (message) throw new APIError('BAD_REQUEST', { message });
          })
        }
      ]
    }
  } satisfies BetterAuthPlugin;
}
