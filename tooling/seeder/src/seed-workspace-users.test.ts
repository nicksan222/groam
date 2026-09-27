import type { AuthenticatedAppUser } from '@groam/app-actions/backend';
import { expect, test } from 'vitest';
import { type SeedWorkspaceUserActions, seedWorkspaceUsers } from './seed-workspace-users';

const owner: AuthenticatedAppUser = {
  cookie: 'better-auth.session_token=owner-token',
  email: 'demo@groam.example',
  name: 'Groam Demo',
  password: 'GroamDemo123!',
  status: 'created',
  userId: 'user-owner'
};

test('serializes invitations without slowing parallel account creation', async () => {
  let activeUsers = 0;
  let peakUsers = 0;
  let activeJoins = 0;
  let peakJoins = 0;
  const workspace = {
    organizationId: 'organization-1',
    organizationName: 'Groam Demo',
    owner
  };
  const app: SeedWorkspaceUserActions = {
    ensureUser: async (profile) => {
      activeUsers += 1;
      peakUsers = Math.max(peakUsers, activeUsers);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeUsers -= 1;
      return {
        ...profile,
        cookie: 'session-token',
        status: 'created',
        userId: profile.email
      };
    },
    ensureWorkspace: async () => workspace,
    listWorkspaceMemberIds: async () => new Set<string>(),
    joinWorkspace: async () => {
      activeJoins += 1;
      peakJoins = Math.max(peakJoins, activeJoins);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeJoins -= 1;
      return 'joined';
    }
  };

  const result = await seedWorkspaceUsers(app, {
    concurrency: 8,
    createWorkspaceIfMissing: true,
    owner,
    userCount: 6
  });
  expect(peakUsers).toBeGreaterThan(1);
  expect(peakJoins).toBe(1);
  expect(result.joinedCount).toBe(6);
});
