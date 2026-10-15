import { env } from '@groam/env/playwright';
import { type BackendAppActions, createBackendActions } from '#src/backend/backend-app-actions';
import type { AuthenticatedAppUser } from '#src/backend/ensure-user';
import type { AppWorkspace } from '#src/backend/ensure-workspace';
import { type TestUserCredentials, uniqueTestUser } from './unique-test-user';

/** One Playwright worker's own user and group, so parallel workers never share data. */
export type WorkerAccount = {
  backend: BackendAppActions;
  credentials: TestUserCredentials;
  user: AuthenticatedAppUser;
  workspace: AppWorkspace;
};

export function createE2eBackend(): BackendAppActions {
  return createBackendActions({ convexUrl: env.convexUrl, siteUrl: env.convexSiteUrl });
}

export async function createWorkerAccount(
  backend: BackendAppActions,
  workerIndex: number
): Promise<WorkerAccount> {
  const credentials = uniqueTestUser(`worker-${workerIndex}`);
  const user = await backend.ensureUser(credentials);
  const workspace = await backend.ensureWorkspace(user, {
    createIfMissing: true,
    name: `E2E Worker ${workerIndex} ${credentials.username.slice(-8)}`
  });
  return { backend, credentials, user, workspace };
}

/** Adds a fresh member to the worker's group through the backend instead of the invite UI. */
export async function addWorkspaceMember(
  account: WorkerAccount,
  prefix = 'member'
): Promise<TestUserCredentials> {
  const credentials = uniqueTestUser(prefix);
  const member = await account.backend.ensureUser(credentials);
  await account.backend.joinWorkspace(account.user, member, account.workspace, false);
  return credentials;
}
