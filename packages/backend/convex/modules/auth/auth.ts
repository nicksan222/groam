import { passkey } from '@better-auth/passkey';
import { type AuthFunctions, createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { type BetterAuthOptions, betterAuth } from 'better-auth/minimal';
import { organization, twoFactor, username } from 'better-auth/plugins';
import authConfig from '#convex/auth.config';
import authSchema from '#convex/components/better-auth/schema';
import { components, internal } from '#convex-generated/api';
import type { DataModel } from '#convex-generated/dataModel';
import { env } from '#convex-generated/server';
import { resolveAuthTrustedOrigins } from './origins';
import { accountRecovery } from './recovery';

const authBaseUrl = env.CONVEX_SITE_URL ?? 'http://127.0.0.1:3211';

export const authSiteUrl = env.SITE_URL ?? authBaseUrl;
export const authTrustedOrigins = resolveAuthTrustedOrigins(authSiteUrl, authBaseUrl);
const passkeyOrigin = new URL(authSiteUrl).origin;

// Better Auth component triggers keep app-owned records synchronized in the
// same transaction as changes to the local Better Auth component.
const authFunctions: AuthFunctions = internal.modules.auth.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  authFunctions,
  local: { schema: authSchema },
  triggers: {
    member: {
      onDelete: async (ctx, member) => {
        await ctx.runMutation(
          internal.modules.discussions.threads.cleanup.removeOrganizationMember,
          {
            organizationId: member.organizationId,
            userId: member.userId
          }
        );
      }
    },
    organization: {
      onDelete: async (ctx, removedOrganization) => {
        await ctx.runMutation(internal.modules.organizations.cleanup.removeOrganizationData, {
          organizationId: removedOrganization._id
        });
      }
    }
  }
});

export const { onDelete } = authComponent.triggersApi();

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    appName: 'Groam',
    baseURL: authBaseUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true
    },
    plugins: [
      username(),
      accountRecovery(),
      passkey({
        origin: passkeyOrigin,
        rpID: new URL(passkeyOrigin).hostname,
        rpName: 'Groam'
      }),
      twoFactor({
        issuer: 'Groam'
      }),
      organization({
        membershipLimit: 100,
        organizationLimit: 10
      }),
      crossDomain({ siteUrl: authSiteUrl }),
      convex({ authConfig })
    ],
    trustedOrigins: authTrustedOrigins
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
