import type {
  AppUser,
  AppUserProfile,
  AppWorkspace,
  AuthenticatedAppUser,
  BackendAppActions
} from '@groam/app-actions/backend';
import { mapWithConcurrency } from './map-with-concurrency';
import { buildUserProfiles } from './user-profiles';

export type SeedWorkspaceUsersInput = {
  concurrency: number;
  createWorkspaceIfMissing: boolean;
  owner: AppUserProfile;
  userCount: number;
};

export type SeedWorkspaceUserActions = Pick<
  BackendAppActions,
  'ensureUser' | 'ensureWorkspace' | 'joinWorkspace' | 'listWorkspaceMemberIds'
>;

export type SeedWorkspaceUsersResult = {
  authenticatedOwner: AuthenticatedAppUser;
  authenticatedUsers: AuthenticatedAppUser[];
  createdCount: number;
  joinedCount: number;
  users: AppUser[];
  workspace: AppWorkspace;
};

export async function seedWorkspaceUsers(
  app: SeedWorkspaceUserActions,
  input: SeedWorkspaceUsersInput
): Promise<SeedWorkspaceUsersResult> {
  const [ownerProfile, ...memberProfiles] = buildUserProfiles(input.userCount, input.owner);
  if (!ownerProfile) throw new Error('The seed scenario requires an owner');

  const authenticatedOwner = await app.ensureUser(ownerProfile);
  const members = await mapWithConcurrency(memberProfiles, input.concurrency, (profile) =>
    app.ensureUser(profile)
  );
  const authenticatedUsers = [authenticatedOwner, ...members];
  const workspace = await app.ensureWorkspace(authenticatedOwner, {
    createIfMissing: input.createWorkspaceIfMissing,
    name: 'Groam Demo'
  });
  const existingMemberIds = await app.listWorkspaceMemberIds(
    authenticatedOwner,
    workspace.organizationId
  );
  const membershipStatuses = await mapWithConcurrency(members, input.concurrency, (member) =>
    app.joinWorkspace(authenticatedOwner, member, workspace, existingMemberIds.has(member.userId))
  );
  const users = authenticatedUsers.map(
    ({ email, name, password, userId }): AppUser => ({ email, name, password, userId })
  );
  const createdCount = authenticatedUsers.filter(({ status }) => status === 'created').length;
  const newlyJoined = membershipStatuses.filter((status) => status === 'joined').length;

  return {
    authenticatedOwner,
    authenticatedUsers,
    createdCount,
    joinedCount: newlyJoined + (authenticatedOwner.status === 'created' ? 1 : 0),
    users,
    workspace
  };
}
