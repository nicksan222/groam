import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { setupTrip } from '#testing/trips';
import { openTripDraft } from '#testing/trips';

export type Reviewer = Pick<Awaited<ReturnType<typeof setupTrip>>['owner'], 'client'>;

export const changedTripDetails = {
  currency: 'EUR' as const,
  dateNotes: 'October school break',
  destination: { name: 'Lisbon', status: 'known' as const },
  duration: { totalDays: 6 },
  name: 'Lisbon proposal'
};

export type TripOwner = Awaited<ReturnType<typeof setupTrip>>['owner'];
export type IdeaId = Id<'tripProposals'>;
export type TripId = Awaited<ReturnType<typeof setupTrip>>['tripId'];

/** Capture reviewed content in an inline run, isolated from scheduled workflow execution. */
export async function beginAgentReview(owner: TripOwner, proposalId: IdeaId) {
  const run = await owner.client.query(api.routes.agents.runs.proposal.run, { proposalId });
  if (!run) throw new Error('Expected an automatic reviewer run');
  if (run.status === 'queued' || run.status === 'running' || run.status === 'waiting') {
    await owner.client.mutation(api.routes.agents.runs.stop.run, { runId: run.id });
  }
  const context = await owner.client.query(
    internal.modules.travel.versions.agent.review.index.context,
    {
      proposalId
    }
  );
  const runId = await owner.client.mutation(
    internal.modules.assistant.runs.functions.queueReviewForViewer,
    {
      proposalId,
      title: context.title,
      tripId: context.sourceTripId
    }
  );
  const claimed = await owner.client.mutation(
    internal.modules.assistant.engine.functions.claimInline,
    { runId }
  );
  if (!claimed) throw new Error('Expected an active inline reviewer run');
  return { expectedReviewRevision: context.expectedReviewRevision, runId };
}

export async function draftChangedVersion(owner: TripOwner, tripId: TripId) {
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  return version;
}

export async function createTitledVersion(owner: TripOwner, tripId: TripId, title: string) {
  return await owner.client.mutation(api.routes.trips.versions.create.run, { title, tripId });
}

/** Submits an idea, has the reviewer approve it, and merges it onto the shared trip. */
export async function mergeIdea(owner: TripOwner, reviewer: Reviewer, proposalId: IdeaId) {
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, { proposalId });
}

/** Opens an idea, sets the working copy's details, and merges it. */
export async function applyIdea(
  owner: TripOwner,
  reviewer: Reviewer,
  tripId: TripId,
  input: Parameters<typeof owner.client.mutation<typeof api.routes.trips.update.run>>[1]['input']
) {
  const version = await openTripDraft(owner, tripId);
  await owner.client.mutation(api.routes.trips.update.run, {
    input,
    tripId: version.workingTripId
  });
  await mergeIdea(owner, reviewer, version.proposalId);
  return version;
}
