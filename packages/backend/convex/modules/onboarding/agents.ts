import { createThread, saveMessages } from '@convex-dev/agent';
import { assistantAgents, type AssistantAgentId } from '@groam/ai/agents';
import { assistantThreadSummary } from '@groam/ai/runtime/thread-summary';
import { components } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { insertWithShortId } from '#convex/modules/references/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';

const disclaimer =
  'Demo example — no model, tools or web search were executed. Prices, bookings and conclusions are illustrative.';

export type DemoLinks = {
  issueId: Id<'tripIssues'>;
  proposalId: Id<'tripProposals'>;
  workingTripId: Id<'trips'>;
  discussionId: Id<'discussions'>;
};

/** Completed examples only: never queue runs, create waits, or start the agent engine. */
async function exampleRun(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  input: {
    agentId: AssistantAgentId;
    title: string;
    report: string;
    issueId?: Id<'tripIssues'>;
    proposalId?: Id<'tripProposals'>;
    discussionId?: Id<'discussions'>;
    threadId?: string;
  }
) {
  const now = Date.now();
  const runId = await insertWithShortId(ctx, 'agentRuns', {
    ...input,
    createdBy: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    organizationId: trip.workspace.organizationId,
    tripId: trip.trip._id,
    kickoff: 'assign',
    surface: input.agentId === 'groam' ? 'chat' : 'standalone',
    status: 'complete',
    startedAt: now,
    completedAt: now,
    updatedAt: now,
    headline: 'Demo: Example work available',
    report: `${disclaimer}\n\n${input.report}`,
    ...(input.agentId === 'researcher'
      ? {
          researchTask: { effort: 'quick' as const, topic: input.title },
          researchResult: { sources: [], incomplete: true }
        }
      : {})
  });
  await ctx.db.insert('agentRunEvents', {
    runId,
    organizationId: trip.workspace.organizationId,
    seq: 0,
    at: now,
    kind: 'report',
    label: 'Demo example loaded',
    detail: disclaimer,
    ok: true
  });
}

export async function seedDemoAgents(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  links: DemoLinks
): Promise<void> {
  const summary =
    'Demo reviewer example: the indoor alternative preserves the shared plan. Confirm step-free access before treating it as ready.';
  const reviewer = {
    kind: 'agent' as const,
    agentId: 'reviewer' as const,
    name: assistantAgents.reviewer.label
  };
  await ctx.db.patch('tripProposals', links.proposalId, {
    status: 'in_review',
    submittedAt: Date.now(),
    feedbackCount: 1,
    unresolvedFeedbackCount: 1,
    groamReview: { commentCount: 1, completedAt: Date.now(), status: 'changes_requested', summary }
  });
  const working = await ctx.db.get('trips', links.workingTripId);
  if (!working?.proposal) throw new Error('Demo idea metadata is missing');
  await ctx.db.patch('trips', working._id, {
    proposal: { ...working.proposal, status: 'in_review' }
  });
  await ctx.db.insert('tripProposalComments', {
    proposalId: links.proposalId,
    sourceTripId: trip.trip._id,
    organizationId: trip.workspace.organizationId,
    author: reviewer,
    kind: 'change_request',
    reviewVerdict: 'changes_requested',
    content: summary,
    updatedAt: Date.now()
  });
  await ctx.db.insert('tripIssueComments', {
    issueId: links.issueId,
    tripId: trip.trip._id,
    organizationId: trip.workspace.organizationId,
    author: { kind: 'agent', agentId: 'issue', name: assistantAgents.issue.label },
    kind: 'comment',
    content: `Demo issue-agent example: I prepared the linked gallery idea and research. Review the proposed changes and the reviewer's access question before applying it. ${disclaimer}`,
    updatedAt: Date.now()
  });
  await ctx.db.patch('tripIssues', links.issueId, { humanCommentCount: 1 });
  await exampleRun(ctx, trip, {
    agentId: 'issue',
    title: 'Demo: Prepare an alternative',
    issueId: links.issueId,
    proposalId: links.proposalId,
    report:
      'Prepared a separate gallery idea and linked research. The shared trip remains available for comparison. Review the idea and resolve the access question before applying it.'
  });
  await exampleRun(ctx, trip, {
    agentId: 'reviewer',
    title: 'Demo: Review the gallery idea',
    proposalId: links.proposalId,
    report: summary
  });
  await exampleRun(ctx, trip, {
    agentId: 'researcher',
    title: 'Demo: Compare indoor alternatives',
    discussionId: links.discussionId,
    report:
      'A gallery provides an indoor afternoon; a cafe is cheaper and more flexible. Verify opening hours, access and cancellation terms. The linked idea illustrates how to record a preferred option without changing the shared itinerary.'
  });
  const threadId = await createThread(ctx, components.agent, {
    title: 'Demo: Explore Groam with your assistant',
    userId: trip.workspace.tokenIdentifier,
    summary: assistantThreadSummary(
      trip.workspace.organizationId,
      [{ kind: 'trip', id: trip.trip._id, tripId: trip.trip._id, label: trip.trip.name }],
      Date.now()
    )
  });
  // Keep a discussion owner for this native thread so normal group cleanup removes it too.
  const welcomeId = await insertWithShortId(ctx, 'discussions', {
    clientRequestId: 'onboarding-demo-welcome-v1',
    createdBy: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    kind: 'assistant',
    organizationId: trip.workspace.organizationId,
    title: 'Demo: Explore Groam with your assistant',
    threadId,
    updatedAt: Date.now()
  });
  await ctx.db.insert('discussionMembers', {
    discussionId: welcomeId,
    kind: 'assistant',
    organizationId: trip.workspace.organizationId,
    userId: trip.workspace.userId,
    lastReadAt: Date.now()
  });
  const welcome = `${disclaimer}\n\nWelcome to your private Demo group! Explore the Rome itinerary, costs and packing lists. Open the rainy-day issue to see an Issue agent's example work, compare its idea, read the reviewer's feedback, and inspect the linked research report. Try the trip poll, edit anything, or create your own group. Connect ChatGPT in Settings → AI when you want live agent help.`;
  await saveMessages(ctx, components.agent, {
    threadId,
    userId: trip.workspace.tokenIdentifier,
    agentName: 'groam',
    messages: [{ role: 'assistant', content: welcome }]
  });
  await exampleRun(ctx, trip, {
    agentId: 'groam',
    title: 'Demo: Meet your planning assistant',
    discussionId: welcomeId,
    threadId,
    report: welcome
  });
}
