import { env } from '@groam/env/journeys';
import { type BackendAppActions, createBackendActions } from '#src/backend/backend-app-actions';
import type { AuthenticatedAppUser } from '#src/backend/ensure-user';
import type { AppWorkspace } from '#src/backend/ensure-workspace';
import { type TestUserCredentials, uniqueTestUser } from './unique-test-user';

/** One journey file's own user and group, so parallel files never share data. */
export type JourneyAccount = {
  backend: BackendAppActions;
  credentials: TestUserCredentials;
  user: AuthenticatedAppUser;
  workspace: AppWorkspace;
};

export function createE2eBackend(): BackendAppActions {
  return createBackendActions({ convexUrl: env.convexUrl, siteUrl: env.convexSiteUrl });
}

export async function createJourneyAccount(
  backend: BackendAppActions,
  journeyIndex: number
): Promise<JourneyAccount> {
  const credentials = uniqueTestUser(`journey-${journeyIndex}`);
  const user = await backend.ensureUser(credentials);
  const workspace = await backend.ensureWorkspace(user, {
    createIfMissing: true,
    name: `E2E Journey ${journeyIndex} ${credentials.username.slice(-8)}`
  });
  return { backend, credentials, user, workspace };
}

/** Adds a fresh member to the account's group through the backend instead of the invite UI. */
export async function joinWorkspaceAsMember(
  account: JourneyAccount,
  prefix = 'member'
): Promise<{ credentials: TestUserCredentials; member: AuthenticatedAppUser }> {
  const credentials = uniqueTestUser(prefix);
  const member = await account.backend.ensureUser(credentials);
  await account.backend.joinWorkspace(account.user, member, account.workspace, false);
  // Like the app does at sign-in, open the group they joined so backend calls act inside it.
  await account.backend.ensureWorkspace(member, {
    createIfMissing: false,
    name: account.workspace.organizationName
  });
  return { credentials, member };
}
