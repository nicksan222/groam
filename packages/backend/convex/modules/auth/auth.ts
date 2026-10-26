import { passkey } from '@better-auth/passkey';
import { type AuthFunctions, createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { type BetterAuthOptions, betterAuth } from 'better-auth/minimal';
import { organization, twoFactor, username } from 'better-auth/plugins';
import { decodeJwt } from 'jose';
import { components, internal } from '#convex-generated/api';
import type { DataModel } from '#convex-generated/dataModel';
import authConfig from '#convex/auth.config';
import authSchema from '#convex/components/better-auth/schema';
import { authEmailRateLimiter } from './email';
import { MAX_USERNAME_LENGTH } from './lengths';
import { fieldLimitsPolicy } from './limits';
import { resolveAuthTrustedOrigins } from './origins';
import { accountRecovery } from './recovery';
import { authSiteLink, resolveAuthBaseUrl, resolveAuthSiteUrl } from './site';
import { emailVerificationPolicy, isPlaceholderEmail, requiresVerifiedEmail } from './verification';

const authBaseUrl = resolveAuthBaseUrl();
export const authSiteUrl = resolveAuthSiteUrl();
export const authTrustedOrigins = resolveAuthTrustedOrigins(authSiteUrl, authBaseUrl);
const passkeyRpId = new URL(authSiteUrl).hostname;
// A passkey belongs to one relying party: accept every trusted origin on its host (locally the
// app on 5173 and the browser journeys on 5174).
const passkeyOrigins = authTrustedOrigins.filter(
  (origin) => new URL(origin).hostname === passkeyRpId
);

// Better Auth component triggers keep app-owned records synchronized in the
// same transaction as changes to the local Better Auth component.
const authFunctions: AuthFunctions = internal.modules.auth.auth;

/** Better Auth caps each group at this many members; server-side roster reads rely on it. */
export const ORGANIZATION_MEMBERSHIP_LIMIT = 100;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  authFunctions,
  local: { schema: authSchema },
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        await ctx.runMutation(internal.modules.onboarding.index.initialize, { userId: user._id });
      },
      onDelete: async (ctx, user) => {
        await ctx.runMutation(internal.modules.ai.chatgpt.storage.removeUserConnections, {
          userId: user._id
        });
      }
    },
    member: {
      onCreate: async (ctx, member) => {
        await ctx.runMutation(internal.modules.travel.issues.resync.organization, {
          organizationId: member.organizationId
        });
      },
      onDelete: async (ctx, member) => {
        await ctx.runMutation(internal.modules.travel.issues.resync.organization, {
          organizationId: member.organizationId
        });
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

export const { onCreate, onDelete } = authComponent.triggersApi();

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  // Hosted without a Resend key nobody could receive the link, so verification is not required.
  const verifiesEmail = requiresVerifiedEmail(authSiteUrl);
  return {
    appName: 'Groam',
    baseURL: authBaseUrl,
    database: authComponent.adapter(ctx),
    disabledPaths: ['/is-username-available'],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: verifiesEmail,
      sendResetPassword: async ({ user, url }) => {
        await scheduleAuthEmail(
          ctx,
          user.email,
          'Reset your Groam password',
          `Reset your password using this link: ${url}\n\nIf you did not request this, ignore this email.`
        );
      },
      revokeSessionsOnPasswordReset: true
    },
    emailVerification: {
      sendOnSignUp: verifiesEmail,
      sendOnSignIn: verifiesEmail,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        const { email: previousEmail, updateTo } = decodeJwt(token);
        if (!updateTo) {
          await scheduleAuthEmail(
            ctx,
            user.email,
            'Verify your Groam email',
            `Verify your email using this link: ${url}\n\nIf you did not create this account, ignore this email.`
          );
          return;
        }
        // The signed-in original account confirms the change from Settings, not the auth server.
        const link = authSiteLink(`/settings/profile?emailChangeToken=${token}`, authSiteUrl);
        await scheduleAuthEmail(
          ctx,
          user.email,
          'Confirm your new Groam email',
          `Confirm this address for your Groam account using this link: ${link}\n\nIf you did not request this change, ignore this email.`
        );
        await scheduleAuthEmail(
          ctx,
          String(previousEmail),
          'Your Groam email is changing',
          `Someone signed in to your Groam account asked to change its email to ${user.email}. It changes only after that address is confirmed.\n\nIf this was not you, sign in and change your password.`
        );
      }
    },
    plugins: [
      username({ maxUsernameLength: MAX_USERNAME_LENGTH }),
      accountRecovery(),
      passkey({
        origin: passkeyOrigins,
        rpID: passkeyRpId,
        rpName: 'Groam'
      }),
      twoFactor({
        issuer: 'Groam'
      }),
      organization({
        membershipLimit: ORGANIZATION_MEMBERSHIP_LIMIT,
        organizationLimit: 10
      }),
      crossDomain({ siteUrl: authSiteUrl }),
      convex({ authConfig }),
      emailVerificationPolicy(),
      fieldLimitsPolicy()
    ],
    user: { changeEmail: { enabled: true } },
    trustedOrigins: authTrustedOrigins
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));

async function scheduleAuthEmail(
  ctx: GenericCtx<DataModel>,
  to: string,
  subject: string,
  text: string
) {
  if (!('scheduler' in ctx)) throw new Error('Authentication email requires an action context');
  // Skip silently: the endpoint's response must not reveal whether the account exists.
  if (isPlaceholderEmail(to)) return;
  const { ok } = await authEmailRateLimiter.limit(ctx, 'authEmail', { key: to.toLowerCase() });
  if (!ok) return;
  await ctx.scheduler.runAfter(0, internal.modules.auth.email.send, { to, subject, text });
}
