/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test';
import { register as registerGeospatial } from '@convex-dev/geospatial/test';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { decodeJwt } from 'jose';
import schema from '#convex/schema';
import { api } from '#convex-generated/api';
import { createTestAuthClient } from './auth/client';
import { registerBetterAuth } from './better-auth';

const appModules = import.meta.glob('../convex/**/*.ts');
const DEFAULT_EMAIL = 'person@example.com';
const TEST_PASSWORD = 'Test-password-1234';

type AuthResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type ConvexJwtClaims = {
  email?: string;
  issuer: string;
  sessionId: string;
  subject: string;
};

export type AuthenticatedTestOptions = {
  email?: string;
  organization?: {
    membership?: 'active' | 'revoked';
    name: string;
  };
};

function requireData<T>(result: AuthResult<T>, operation: string): T {
  if (result.error || result.data === null) {
    throw new Error(result.error?.message ?? `Better Auth failed to ${operation}`);
  }
  return result.data;
}

function decodeJwtClaims(token: string): ConvexJwtClaims {
  const claims = decodeJwt(token);
  if (
    typeof claims.iss !== 'string' ||
    typeof claims.sub !== 'string' ||
    typeof claims.sessionId !== 'string'
  ) {
    throw new Error('Better Auth returned a Convex JWT without identity claims');
  }
  return {
    ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
    issuer: claims.iss,
    sessionId: claims.sessionId,
    subject: claims.sub
  };
}

export function createTest() {
  const test = convexTest(schema, appModules);
  registerBetterAuth(test);
  registerAgent(test);
  registerGeospatial(test);
  registerRateLimiter(test);
  return test;
}

async function signUp(http: ReturnType<typeof createTest>, email: string, name: string) {
  const auth = createTestAuthClient(http);
  const result = await auth.client.signUp.email({ email, name, password: TEST_PASSWORD });
  const data = requireData(result, 'create a test user');
  if (typeof data.token !== 'string') throw new Error('Better Auth did not create a test session');
  auth.setSessionToken(data.token);
  return { auth, userId: data.user.id };
}

export async function createTestUser(
  test: ReturnType<typeof createTest>,
  { email, name = 'Test Person' }: { email: string; name?: string }
) {
  const { auth, userId } = await signUp(test, email, name);
  const { token } = requireData(await auth.client.convex.token(), 'issue a Convex access token');
  const claims = decodeJwtClaims(token);
  if (claims.subject !== userId) {
    throw new Error('Better Auth issued a JWT for the wrong test user');
  }
  const client = test.withIdentity({
    email: claims.email ?? email,
    issuer: claims.issuer,
    sessionId: claims.sessionId,
    subject: claims.subject,
    tokenIdentifier: `${claims.issuer}|${claims.subject}`
  });
  return { authClient: auth.client, client, userId };
}

export async function createAuthenticatedTest({
  email = DEFAULT_EMAIL,
  organization
}: AuthenticatedTestOptions = {}) {
  const test = createTest();
  const { authClient, client, userId } = await createTestUser(test, { email });
  const organizationId = organization
    ? requireData(
        await authClient.organization.create({
          name: organization.name,
          slug: `${organization.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}`
        }),
        'create a test organization'
      ).id
    : null;

  if (organizationId) {
    requireData(
      await authClient.organization.setActive({ organizationId }),
      'activate a test organization'
    );
  }
  if (organizationId && organization?.membership === 'revoked') {
    const replacementOwnerEmail = `owner-${crypto.randomUUID()}@example.com`;
    const replacementOwner = await createTestUser(test, { email: replacementOwnerEmail });
    const invitation = await client.mutation(api.routes.organizations.invitations.create.run, {
      role: 'admin'
    });
    await replacementOwner.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: invitation.code
    });
    const activeOrganization = requireData(
      await authClient.organization.getFullOrganization(),
      'load the organization with its replacement owner'
    );
    const replacementMembership = activeOrganization.members.find(
      (member) => member.userId === replacementOwner.userId
    );
    if (!replacementMembership) throw new Error('Replacement owner membership was not created');
    requireData(
      await authClient.organization.updateMemberRole({
        memberId: replacementMembership.id,
        organizationId,
        role: 'owner'
      }),
      'promote the replacement organization owner'
    );
    requireData(
      await replacementOwner.authClient.organization.setActive({ organizationId }),
      'activate the replacement owner organization'
    );
    requireData(
      await replacementOwner.authClient.organization.removeMember({
        memberIdOrEmail: email,
        organizationId
      }),
      'remove a test organization member'
    );
  }

  return { authClient, client, organizationId, test, userId };
}

export async function createOutsiderClient(test: ReturnType<typeof createTest>) {
  const outsider = await createTestUser(test, {
    email: `outsider-${crypto.randomUUID()}@example.com`,
    name: 'Outsider'
  });
  const organization = requireData(
    await outsider.authClient.organization.create({
      name: 'Other Group',
      slug: `other-${crypto.randomUUID()}`
    }),
    'create outsider organization'
  );
  requireData(
    await outsider.authClient.organization.setActive({ organizationId: organization.id }),
    'activate outsider organization'
  );
  return outsider;
}
