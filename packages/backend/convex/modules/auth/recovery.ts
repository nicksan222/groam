import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api';
import { generateRandomString } from 'better-auth/crypto';
import { z } from 'zod';

const codeCount = 8;
const recoveryLifetimeMs = 10 * 365 * 24 * 60 * 60 * 1000;
const recoveryManifest = z.object({ generation: z.string(), identifiers: z.array(z.string()) });
const recoveryPathPrefix = '/account-recovery/';

const normalizeCode = (code: string) => code.replaceAll('-', '').trim().toUpperCase();

const formatCode = (code: string) => code.replace(/(.{4})(?=.)/gu, '$1-');

async function recoveryCodeIdentifier(code: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizeCode(code))
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
  return `account-recovery-code:${hex}`;
}

function parseRecoveryManifest(value: string | null) {
  if (!value) return null;
  try {
    const parsed = recoveryManifest.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Offline password recovery codes for deployments without an email provider. */
export function accountRecovery() {
  return {
    id: 'account-recovery',
    endpoints: {
      generateAccountRecoveryCodes: createAuthEndpoint(
        '/account-recovery/generate',
        {
          body: z.object({ password: z.string().min(1) }),
          method: 'POST',
          use: [sensitiveSessionMiddleware]
        },
        async (ctx) => {
          const userId = ctx.context.session.user.id;
          await ctx.context.password.checkPassword(userId, ctx);
          const generation = generateRandomString(32, 'a-z', 'A-Z', '0-9');
          const expiresAt = new Date(Date.now() + recoveryLifetimeMs);
          const codes = Array.from({ length: codeCount }, () =>
            formatCode(generateRandomString(20, 'A-Z', '0-9'))
          );
          const identifiers = await Promise.all(
            codes.map(async (code) => await recoveryCodeIdentifier(code))
          );
          const manifestIdentifier = `account-recovery-generation:${userId}`;
          const existingManifest =
            await ctx.context.internalAdapter.findVerificationValue(manifestIdentifier);
          const parsedExistingManifest = parseRecoveryManifest(existingManifest?.value ?? null);
          if (parsedExistingManifest) {
            await Promise.all(
              parsedExistingManifest.identifiers.map((identifier) =>
                ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier)
              )
            );
          }
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(manifestIdentifier);

          await ctx.context.internalAdapter.createVerificationValue({
            expiresAt,
            identifier: manifestIdentifier,
            value: JSON.stringify({ generation, identifiers })
          });

          await Promise.all(
            identifiers.map(async (identifier) => {
              await ctx.context.internalAdapter.createVerificationValue({
                expiresAt,
                identifier,
                value: `${userId}:${generation}`
              });
            })
          );

          return ctx.json({ codes });
        }
      ),
      resetPasswordWithRecoveryCode: createAuthEndpoint(
        '/account-recovery/reset-password',
        {
          body: z.object({
            code: z.string().min(20).max(24),
            newPassword: z.string().min(1),
            username: z.string().min(3).max(30)
          }),
          method: 'POST'
        },
        async (ctx) => {
          const username = ctx.body.username.trim().toLowerCase();
          const identifier = await recoveryCodeIdentifier(ctx.body.code);
          const [user, recovered] = await Promise.all([
            ctx.context.adapter.findOne<{ id: string }>({
              model: 'user',
              where: [{ field: 'username', value: username }]
            }),
            ctx.context.internalAdapter.findVerificationValue(identifier)
          ]);
          const userId = user?.id ?? '';
          const manifestIdentifier = `account-recovery-generation:${userId || 'unknown'}`;
          const generation =
            await ctx.context.internalAdapter.findVerificationValue(manifestIdentifier);
          const parsedGeneration = parseRecoveryManifest(generation?.value ?? null);
          const expectedValue =
            userId && parsedGeneration ? `${userId}:${parsedGeneration.generation}` : null;
          const generationIdentifiers = parsedGeneration?.identifiers ?? [];
          const assertValidRecovery = (record: typeof recovered) => {
            if (!expectedValue || record?.value !== expectedValue) {
              throw ctx.error('UNAUTHORIZED', { message: 'Invalid username or recovery code' });
            }
          };
          assertValidRecovery(recovered);

          const minLength = ctx.context.password.config.minPasswordLength;
          const maxLength = ctx.context.password.config.maxPasswordLength;
          if (ctx.body.newPassword.length < minLength || ctx.body.newPassword.length > maxLength) {
            throw ctx.error('BAD_REQUEST', {
              message: `Password must be between ${minLength} and ${maxLength} characters`
            });
          }

          const password = await ctx.context.password.hash(ctx.body.newPassword);
          const consumedGeneration =
            await ctx.context.internalAdapter.consumeVerificationValue(manifestIdentifier);
          const parsedConsumedGeneration = parseRecoveryManifest(consumedGeneration?.value ?? null);
          if (
            !parsedConsumedGeneration ||
            parsedConsumedGeneration.generation !== parsedGeneration?.generation
          ) {
            throw ctx.error('UNAUTHORIZED', { message: 'Invalid username or recovery code' });
          }
          const consumed = await ctx.context.internalAdapter.consumeVerificationValue(identifier);
          assertValidRecovery(consumed);
          await ctx.context.internalAdapter.updatePassword(userId, password);

          await ctx.context.internalAdapter.deleteUserSessions(userId);
          await Promise.all(
            generationIdentifiers.map((identifier) =>
              ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier)
            )
          );
          return ctx.json({ status: true });
        }
      )
    },
    rateLimit: [
      {
        max: 5,
        pathMatcher: (path) => path.startsWith(recoveryPathPrefix),
        window: 60
      }
    ]
  } as const satisfies BetterAuthPlugin;
}
