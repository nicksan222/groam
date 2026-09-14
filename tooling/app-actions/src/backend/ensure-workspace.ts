import type { BackendSession } from './backend-session';
import { authRequest, postRequired } from './better-auth-request';
import { asObject, assertResponse, requiredString, responseJson } from './better-auth-response';
import type { AppUser, AuthenticatedAppUser } from './ensure-user';

export type AppWorkspace = {
  organizationId: string;
  organizationName: string;
  owner: AppUser;
};

export type EnsureWorkspaceInput = {
  createIfMissing: boolean;
  name: string;
};

type Organization = { id: string; name: string; slug: string };

function organization(value: unknown): Organization {
  const object = asObject(value, 'organization');
  return {
    id: requiredString(object.id, 'organization id'),
    name: requiredString(object.name, 'organization name'),
    slug: requiredString(object.slug, 'organization slug')
  };
}

function stableSuffix(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export async function ensureWorkspace(
  backend: BackendSession,
  owner: AuthenticatedAppUser,
  input: EnsureWorkspaceInput
): Promise<AppWorkspace> {
  const authUrl = new URL('/api/auth/', backend.config.siteUrl);
  const organizationsResponse = await authRequest(
    backend,
    new URL('organization/list', authUrl),
    undefined,
    owner.cookie
  );
  await assertResponse(organizationsResponse, 'list demo organizations');
  const rawOrganizations = await responseJson(organizationsResponse, 'organization list');
  if (!Array.isArray(rawOrganizations)) {
    throw new Error('Better Auth returned an invalid organization list');
  }

  let selected = rawOrganizations
    .map((value) => organization(value))
    .find(({ name }) => name === input.name);

  if (!selected) {
    if (!input.createIfMissing)
      throw new Error(`Workspace "${input.name}" does not exist and creation is disabled`);
    const response = await authRequest(
      backend,
      new URL('organization/create', authUrl),
      {
        name: input.name,
        slug: `${input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/gu, '-')
          .replace(/^-|-$/gu, '')}-${stableSuffix(owner.email)}`
      },
      owner.cookie
    );
    await assertResponse(response, 'create the demo organization');
    selected = organization(await responseJson(response, 'organization'));
  }

  await postRequired(
    backend,
    new URL('organization/set-active', authUrl),
    { organizationId: selected.id },
    owner.cookie,
    'activate the demo organization'
  );

  return {
    organizationId: selected.id,
    organizationName: selected.name,
    owner: {
      email: owner.email,
      name: owner.name,
      password: owner.password,
      userId: owner.userId
    }
  };
}
