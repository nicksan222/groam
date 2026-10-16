import type { CreateIssueInput } from '#src/actions/create-issue';
import type { CreateTripInput } from '#src/actions/create-trip';
import type { IssueStatus } from '#src/actions/set-issue-status';
import type { UpdateTripInput } from '#src/actions/update-trip';
import type { AuthenticatedAppUser } from '#src/backend/ensure-user';
import {
  createE2eBackend,
  createJourneyAccount,
  joinWorkspaceAsMember,
  type JourneyAccount
} from '#src/testing/journey-account';
import { uniqueTestUser } from '#src/testing/unique-test-user';

// Journey files run in parallel; each one owns an account and group, created on first use.
const accounts = new Map<string, Promise<JourneyAccount>>();

function accountFor(testPath: string): Promise<JourneyAccount> {
  let account = accounts.get(testPath);
  if (!account) {
    account = createJourneyAccount(createE2eBackend(), accounts.size);
    accounts.set(testPath, account);
  }
  return account;
}

// People a journey added to its group, by email, so later arrangements can act as them.
const members = new Map<string, AuthenticatedAppUser>();

function memberFor(email: string): AuthenticatedAppUser {
  const member = members.get(email);
  if (!member) throw new Error(`No journey member was added with the email ${email}`);
  return member;
}

function asOwner<Args extends unknown[], Result>(
  run: (owner: JourneyAccount, ...args: Args) => Promise<Result>
) {
  return async (testPath: string, ...args: Args) => run(await accountFor(testPath), ...args);
}

/** Node-side setup for journeys, run as the calling test file's owner. */
export const journeyBackend = {
  account: asOwner(async ({ credentials, workspace }) => ({
    credentials,
    groupName: workspace.organizationName,
    organizationId: workspace.organizationId
  })),
  /** Adds a member to the owner's group; the returned credentials let a journey sign in as them. */
  addMember: asOwner(async (owner, prefix?: string) => {
    const { credentials, member } = await joinWorkspaceAsMember(owner, prefix);
    members.set(credentials.email, member);
    return credentials;
  }),
  /** A group member (added earlier) approves or withdraws approval of an idea found by name. */
  approveIdea: asOwner(
    async (
      { backend },
      input: { approved?: boolean; ideaName: string; memberEmail: string; tripId: string }
    ) => {
      const member = memberFor(input.memberEmail);
      const { proposalId } = await backend.findIdea(member, {
        name: input.ideaName,
        tripId: input.tripId
      });
      await backend.approveIdea(member, { approved: input.approved, proposalId });
    }
  ),
  /** Creates an invitation code for the owner's group. */
  createInvitation: asOwner(({ backend, user }) => backend.createInvitation(user)),
  createIssue: asOwner(({ backend, user }, input: CreateIssueInput & { tripId: string }) =>
    backend.createIssue(user, input)
  ),
  createTrip: asOwner(({ backend, user }, input: CreateTripInput) =>
    backend.createTrip(user, input)
  ),
  /** A brand-new person redeems an invitation code, as someone who was sent it would. */
  redeemInvitation: asOwner(async ({ backend }, code: string) => {
    const credentials = uniqueTestUser('invited');
    const invited = await backend.ensureUser(credentials);
    await backend.redeemInvitation(invited, code);
    members.set(credentials.email, invited);
    return credentials;
  }),
  requestIdeaReview: asOwner(({ backend, user }, proposalId: string) =>
    backend.requestIdeaReview(user, { proposalId })
  ),
  setIssueStatus: asOwner(({ backend, user }, input: { issueId: string; status: IssueStatus }) =>
    backend.setIssueStatus(user, input)
  ),
  startIdea: asOwner(({ backend, user }, input: { name: string; tripId: string }) =>
    backend.startIdea(user, input)
  ),
  updateTrip: asOwner(({ backend, user }, input: UpdateTripInput & { tripId: string }) =>
    backend.updateTrip(user, input)
  )
};

export type JourneyBackend = typeof journeyBackend;
