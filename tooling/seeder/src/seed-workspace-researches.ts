import type { AuthenticatedAppUser, BackendAppActions } from '@groam/app-actions/backend';
import { buildResearchPlans, selectResearchTripIndexes } from './build-research-plans';
import { buildWorkspaceSeedPlans } from './build-workspace-seed-plans';
import { mapWithConcurrency } from './map-with-concurrency';

export type SeedWorkspaceResearchActions = Pick<
  BackendAppActions,
  | 'createIssue'
  | 'createResearch'
  | 'findTripResearchTargets'
  | 'linkResearch'
  | 'postResearchMessage'
>;

export type SeedWorkspaceResearchesInput = {
  concurrency: number;
  owner: AuthenticatedAppUser;
  tripCount: number;
  tripIds: readonly string[];
  users: readonly AuthenticatedAppUser[];
};

export type SeedWorkspaceResearchesResult = { researchCount: number };

const ISSUE_TITLE = 'Decide what to see and where to eat';

export async function seedWorkspaceResearches(
  app: SeedWorkspaceResearchActions,
  input: SeedWorkspaceResearchesInput
): Promise<SeedWorkspaceResearchesResult> {
  const plans = buildWorkspaceSeedPlans(input.tripCount);
  const indexes = selectResearchTripIndexes(
    plans.map((plan, index) => ({
      archived: plan.archived,
      known: plan.create.destination.status === 'known' && input.tripIds[index] !== undefined
    }))
  );
  const counts = await mapWithConcurrency(indexes, input.concurrency, async (index) => {
    const tripId = input.tripIds[index];
    if (!tripId) return 0;
    return await seedTripResearches(app, input, index, tripId);
  });
  return { researchCount: counts.reduce((sum, count) => sum + count, 0) };
}

async function seedTripResearches(
  app: SeedWorkspaceResearchActions,
  input: SeedWorkspaceResearchesInput,
  tripIndex: number,
  tripId: string
): Promise<number> {
  const targets = await app.findTripResearchTargets(input.owner, { tripId });
  if (!targets.destination) return 0;
  const issueId =
    targets.issues.find(({ title }) => title === ISSUE_TITLE)?.id ??
    (await app.createIssue(input.owner, {
      body: 'Pick a few sights and restaurants before booking anything.',
      title: ISSUE_TITLE,
      tripId
    }));
  const people = input.users.length > 0 ? input.users : [input.owner];
  const actor = (offset: number) => people[(tripIndex + offset) % people.length] ?? input.owner;
  const city = targets.destination.name.split(',')[0] ?? targets.destination.name;
  const sequence = String(tripIndex + 1).padStart(4, '0');

  // Creating a research is rate limited per person, so spread creators across the travelers.
  for (const [planIndex, plan] of buildResearchPlans(city).entries()) {
    const requestKey = `seed:v2:research:${tripId}:${sequence}:${plan.key}`;
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Creation is rate limited per person; seed one at a time.
    const discussionId = await app.createResearch(actor(planIndex), {
      brief: plan.brief,
      clientRequestId: requestKey,
      title: plan.title,
      tripId
    });
    for (const [messageIndex, message] of plan.messages.entries()) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Messages must land in conversation order.
      await app.postResearchMessage(actor(message.authorIndex), {
        clientRequestId: `${requestKey}:message:${messageIndex}`,
        discussionId,
        text: message.text
      });
    }
    await app.linkResearch(actor(planIndex), {
      discussionId,
      target: { issueId, kind: 'issue' }
    });
    await app.linkResearch(actor(planIndex), {
      discussionId,
      target: { kind: 'tripTarget', target: { id: targets.destination.id, type: 'destination' } }
    });
  }
  return 2;
}
