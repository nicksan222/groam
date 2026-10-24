import type {
  AppUserProfile,
  AuthenticatedAppUser,
  BackendAppActions
} from '@groam/app-actions/backend';
import { buildTripPlan } from './build-trip-plan';
import { mapWithConcurrency } from './map-with-concurrency';
import { buildCast } from './seed-cast';
import { seedGroups } from './seed-groups';
import type { PersonKey, SeedGroup, SeedResearch, SeedTrip } from './seed-types';

export type SeedWorkspaceInput = {
  concurrency: number;
  owner: AppUserProfile;
  reset: boolean;
};

export type SeedWorkspaceActions = Pick<
  BackendAppActions,
  | 'createIssue'
  | 'createResearch'
  | 'createTrips'
  | 'ensureUser'
  | 'ensureWorkspace'
  | 'findTripResearchTargets'
  | 'joinWorkspace'
  | 'linkResearch'
  | 'listWorkspaceMemberIds'
  | 'postResearchMessage'
  | 'resetLocalDevelopmentData'
>;

export type SeedWorkspaceResult = {
  groupCount: number;
  issueCount: number;
  owner: AuthenticatedAppUser;
  reset?: Awaited<ReturnType<SeedWorkspaceActions['resetLocalDevelopmentData']>>;
  researchCount: number;
  tripCount: number;
  userCount: number;
};

type People = ReadonlyMap<PersonKey, AuthenticatedAppUser>;

function person(people: People, key: PersonKey): AuthenticatedAppUser {
  const user = people.get(key);
  if (!user) throw new Error(`Seed cast is missing ${key}`);
  return user;
}

export async function seedWorkspace(
  app: SeedWorkspaceActions,
  input: SeedWorkspaceInput
): Promise<SeedWorkspaceResult> {
  const reset = input.reset ? await app.resetLocalDevelopmentData() : undefined;
  const cast = [...buildCast(input.owner)];
  const accounts = await mapWithConcurrency(cast, input.concurrency, async ([key, profile]) => {
    const user = await app.ensureUser(profile);
    return [key, user] as const;
  });
  const people: People = new Map(accounts);

  let issueCount = 0;
  let researchCount = 0;
  let tripCount = 0;
  // Groups run in order: activating a group is per session, and one person sits in both.
  for (const group of seedGroups) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each group activates its organization for shared members.
    const seeded = await seedGroup(app, group, people);
    issueCount += seeded.issueCount;
    researchCount += seeded.researchCount;
    tripCount += seeded.tripCount;
  }
  return {
    groupCount: seedGroups.length,
    issueCount,
    owner: person(people, 'elena'),
    researchCount,
    tripCount,
    userCount: people.size,
    ...(reset ? { reset } : {})
  };
}

async function seedGroup(app: SeedWorkspaceActions, group: SeedGroup, people: People) {
  const owner = person(people, group.owner);
  const members = group.members.map((key) => person(people, key));
  const workspace = await app.ensureWorkspace(owner, { createIfMissing: true, name: group.name });
  const existing = await app.listWorkspaceMemberIds(owner, workspace.organizationId);
  // Invitations touch one organization, so joins run one at a time to avoid OCC retries.
  await mapWithConcurrency(members, 1, (member) =>
    app.joinWorkspace(owner, member, workspace, existing.has(member.userId))
  );
  await mapWithConcurrency(members, 1, (member) =>
    app.ensureWorkspace(member, { createIfMissing: false, name: group.name })
  );

  let issueCount = 0;
  let researchCount = 0;
  for (const trip of group.trips) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Trips share the organization's rate buckets.
    const [tripId] = await app.createTrips(owner, [buildTripPlan(trip)]);
    if (!tripId || trip.archived) continue;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Content follows its trip.
    const added = await seedTripContent(app, { people, group, tripId, trip });
    issueCount += added.issueCount;
    researchCount += added.researchCount;
  }
  return { issueCount, researchCount, tripCount: group.trips.length };
}

async function seedTripContent(
  app: SeedWorkspaceActions,
  {
    people,
    group,
    tripId,
    trip
  }: { people: People; group: SeedGroup; tripId: string; trip: SeedTrip }
) {
  const owner = person(people, group.owner);
  const issueIds = new Map<string, string>();
  for (const issue of trip.issues ?? []) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Issues are listed in creation order.
    issueIds.set(issue.title, await app.createIssue(owner, { ...issue, tripId }));
  }
  const researches = trip.researches ?? [];
  if (researches.length === 0) return { issueCount: issueIds.size, researchCount: 0 };
  const targets = await app.findTripResearchTargets(owner, { tripId });
  for (const research of researches) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Creation is rate limited per person.
    await seedResearch(app, { people, research, targets, tripId, issueIds });
  }
  return { issueCount: issueIds.size, researchCount: researches.length };
}

async function seedResearch(
  app: SeedWorkspaceActions,
  {
    people,
    research,
    targets,
    tripId,
    issueIds
  }: {
    issueIds: ReadonlyMap<string, string>;
    people: People;
    research: SeedResearch;
    targets: Awaited<ReturnType<SeedWorkspaceActions['findTripResearchTargets']>>;
    tripId: string;
  }
) {
  const author = person(people, research.messages[0]?.by ?? 'elena');
  const requestKey = `seed:v3:research:${tripId}:${research.key}`;
  const discussionId = await app.createResearch(author, {
    brief: research.brief,
    clientRequestId: requestKey,
    title: research.title,
    tripId
  });
  for (const [index, message] of research.messages.entries()) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Messages must land in conversation order.
    await app.postResearchMessage(person(people, message.by), {
      clientRequestId: `${requestKey}:message:${index}`,
      discussionId,
      text: message.text
    });
  }
  const issueId = research.issue ? issueIds.get(research.issue) : undefined;
  if (issueId) await app.linkResearch(author, { discussionId, target: { issueId, kind: 'issue' } });
  if (targets.destination) {
    await app.linkResearch(author, {
      discussionId,
      target: { kind: 'tripTarget', target: { id: targets.destination.id, type: 'destination' } }
    });
  }
}
