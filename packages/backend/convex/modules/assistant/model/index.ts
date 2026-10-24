import { updateThreadMetadata } from '@convex-dev/agent';
import type { AssistantContextTag } from '@groam/ai/runtime/context-tag';
import {
  assistantThreadSummary,
  parseAssistantThreadSummary
} from '@groam/ai/runtime/thread-summary';
import { ConvexError, v } from 'convex/values';
import { components } from '#convex-generated/api';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import {
  internalWorkspaceMutation,
  internalWorkspaceQuery,
  type Workspace
} from '#convex/modules/auth/workspace';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripStayValidators } from '#convex/modules/travel/stays/schema';
import { TripTargets } from '#convex/modules/travel/targets/index';
import { tripCostSplit, tripCostSplitValidator } from '#convex/modules/travel/trips/costs';
import {
  assertMutable,
  internalDestinationMutation,
  internalTripMutation,
  internalTripQuery,
  type MutableTripCtx,
  patchTrip,
  recordActivity
} from '#convex/modules/travel/trips/ctx';
import { updateTravelDates } from '#convex/modules/travel/trips/index';
import { normalizeCost } from '#convex/modules/travel/trips/normalize';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { TripVersions } from '#convex/modules/travel/versions/index';
import {
  assistantContextCatalogItemValidator,
  assistantContextTagReferenceValidator,
  assistantContextTagValidator,
  conversationScopeValidator,
  itineraryCostTargetValidator,
  MAX_CATALOG_TRIPS,
  MAX_CONTEXT_TAGS,
  taggedContextEntryValidator,
  tripAssistantContextValidator
} from './schema';
import { AssistantThreads } from './thread/access';
import { AssistantTripContext } from './trip/context';

export type {
  AssistantChat,
  AssistantContextCatalogItem,
  AssistantContextTagReference,
  TaggedContextEntry,
  TripAssistantContext
} from './schema';

export {
  assistantChatValidator,
  assistantContextCatalogItemValidator,
  assistantContextTagReferenceValidator,
  assistantContextTagValidator,
  taggedContextEntryValidator,
  tripAssistantContextValidator
} from './schema';

/**
 * Splits stored tags by what this viewer may do with them: `visible` ones they can read, `hidden`
 * ones sit on a trip in their group they hold no seat on (kept untouched when they edit a shared
 * chat's tags), and `missing` ones, whose target is gone, are dropped.
 */
async function classifyTags(
  ctx: MutationCtx | QueryCtx,
  workspace: Workspace,
  tags: AssistantContextTag[]
) {
  const states = await Promise.all(
    tags.map(async (tag) => {
      const reference = TripTargets.normalizeContextTag(ctx, tag);
      return reference ? await TripTargets.tagVisibility(ctx, workspace, reference) : 'missing';
    })
  );
  return {
    hidden: tags.filter((_, index) => states[index] === 'hidden'),
    visible: tags.filter((_, index) => states[index] === 'visible')
  };
}

export const access = internalWorkspaceQuery({
  args: {
    scope: v.optional(conversationScopeValidator),
    threadId: v.optional(v.string())
  },
  returns: v.object({
    credentialOwnerUserId: v.string(),
    organizationId: v.string(),
    tags: v.array(assistantContextTagValidator),
    threadTitle: v.union(v.string(), v.null()),
    userId: v.string()
  }),
  handler: async (ctx, { scope = 'private', threadId }) => {
    if (threadId) {
      const { tags, thread, workspace } = await AssistantThreads.require(ctx, threadId, scope);
      return {
        credentialOwnerUserId: workspace.userId,
        organizationId: workspace.organizationId,
        // Another member's tag on a trip this viewer has no seat on never steers their turn.
        tags: (await classifyTags(ctx, workspace, tags)).visible,
        threadTitle: thread.title ?? null,
        userId: workspace.tokenIdentifier
      };
    }
    const { workspace } = ctx;
    return {
      credentialOwnerUserId: workspace.userId,
      organizationId: workspace.organizationId,
      tags: [],
      threadTitle: null,
      userId: workspace.tokenIdentifier
    };
  }
});

export const tripContext = internalTripQuery({
  args: {},
  returns: tripAssistantContextValidator,
  handler: async (ctx) => await AssistantTripContext.load(ctx, ctx.trip._id)
});

export const contextCatalog = internalWorkspaceQuery({
  args: {},
  returns: v.array(assistantContextCatalogItemValidator),
  handler: async (ctx) => {
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_organizationId_and_updatedAt', (query) =>
        query.eq('organizationId', ctx.workspace.organizationId)
      )
      .order('desc')
      .take(MAX_CATALOG_TRIPS);
    return await TripTargets.contextCatalog(ctx, ctx.workspace, trips);
  }
});

export const taggedContext = internalWorkspaceQuery({
  args: {
    scope: v.optional(conversationScopeValidator),
    threadId: v.string()
  },
  returns: v.array(taggedContextEntryValidator),
  handler: async (ctx, { scope = 'private', threadId }) => {
    const { tags, workspace } = await AssistantThreads.require(ctx, threadId, scope);
    const references = [];
    for (const tag of tags) {
      const reference = TripTargets.normalizeContextTag(ctx, tag);
      if (reference) references.push(reference);
    }
    const entries = await Promise.all(
      references.map(async (reference) => {
        // In a shared chat, a tag someone else added may point at a trip this viewer has no
        // seat on, or at something deleted; it is left out of their context, not a failed turn.
        const read = await TripTargets.readContextTag(ctx, workspace, reference);
        if (!read) return null;
        const details =
          reference.kind === 'trip'
            ? await AssistantTripContext.load(ctx, reference.id)
            : await read.details();
        return { ...read.tag, details: JSON.stringify(details) };
      })
    );
    return entries.filter((entry) => entry !== null);
  }
});

/**
 * Stamps a sent prompt on the thread: when it was last used, the screen it came from, and a
 * generated title. Rewrites the summary around the tags as stored, not as this viewer sees them,
 * so an unseated sender never drops tags other members attached.
 */
export const recordPrompt = internalWorkspaceMutation({
  args: {
    scope: v.optional(conversationScopeValidator),
    screenContext: v.string(),
    threadId: v.string(),
    title: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, { scope = 'private', screenContext, threadId, title }) => {
    const { tags, workspace } = await AssistantThreads.require(ctx, threadId, scope);
    await updateThreadMetadata(ctx, components.agent, {
      patch: {
        summary: assistantThreadSummary(workspace.organizationId, tags, Date.now(), screenContext),
        ...(title ? { title } : {})
      },
      threadId
    });
    return null;
  }
});

export const setContextTags = internalWorkspaceMutation({
  args: {
    scope: v.optional(conversationScopeValidator),
    tags: v.array(assistantContextTagReferenceValidator),
    threadId: v.string()
  },
  returns: v.array(assistantContextTagValidator),
  handler: async (ctx, { scope = 'private', tags, threadId }) => {
    if (tags.length > MAX_CONTEXT_TAGS) {
      throw new ConvexError(`An AI chat can have at most ${MAX_CONTEXT_TAGS} context tags`);
    }
    const {
      access,
      tags: stored,
      thread,
      workspace
    } = await AssistantThreads.require(ctx, threadId, scope);
    access?.assertWritable();
    const unique = tags.filter(
      (tag, index) =>
        tags.findIndex((candidate) => candidate.kind === tag.kind && candidate.id === tag.id) ===
        index
    );
    // In a shared chat, tags another member added on trips this viewer cannot see stay as they
    // are: the viewer can neither read nor remove them. Only new references must be visible.
    const { hidden } = await classifyTags(ctx, workspace, stored);
    const isHidden = (tag: { id: string; kind: string }) =>
      hidden.some((other) => other.kind === tag.kind && other.id === tag.id);
    const visible = await Promise.all(
      unique
        .filter((tag) => !isHidden(tag))
        .map((tag) => TripTargets.resolveContextTag(ctx, workspace, tag))
    );
    const resolved = [...visible, ...hidden];
    if (resolved.length > MAX_CONTEXT_TAGS) {
      throw new ConvexError(`An AI chat can have at most ${MAX_CONTEXT_TAGS} context tags`);
    }
    await updateThreadMetadata(ctx, components.agent, {
      patch: {
        summary: assistantThreadSummary(
          workspace.organizationId,
          resolved,
          Date.now(),
          parseAssistantThreadSummary(thread.summary)?.screenContext
        )
      },
      threadId
    });
    return resolved;
  }
});

export const createTripIssue = internalTripMutation({
  args: TripIssueValidators.createInput,
  returns: v.id('tripIssues'),
  handler: (ctx, { body, title }) => TripIssues.createAssignedToIssueAgent(ctx, title, body)
});

export const prepareTripVersion = internalTripMutation({
  args: {
    issueId: v.optional(v.id('tripIssues')),
    runId: v.optional(v.id('agentRuns'))
  },
  returns: v.object({
    ideaName: v.string(),
    proposalId: v.id('tripProposals'),
    workingTripId: v.id('trips')
  }),
  handler: async (ctx, { issueId, runId }) => {
    // Already on an idea working copy — reopen it; never branch an idea from an idea.
    const existing = await TripVersions.existingForWorkingTrip(ctx, ctx.trip._id);
    if (existing) {
      if (runId) await AgentRuns.attachProposal(ctx, runId, existing.proposalId);
      return existing;
    }
    const created = await TripVersions.create(ctx, ctx.trip._id, issueId ? { issueId } : undefined);
    if (runId) await AgentRuns.attachProposal(ctx, runId, created.proposalId);
    return created;
  }
});

function assertAgentCanWrite(ctx: MutableTripCtx): void {
  if (ctx.trip.proposal?.status !== 'draft') {
    throw new ConvexError('Only a draft idea can be written to');
  }
  // Reauthorize the writer on every write, not just the status check.
  assertMutable(ctx);
}

export const setTripVersionDates = internalTripMutation({
  args: TripValidators.travelDates,
  returns: v.null(),
  handler: async (ctx, { endDate, startDate }) => {
    assertAgentCanWrite(ctx);
    return await updateTravelDates(ctx, ctx.trip._id, startDate, endDate);
  }
});

export const extendItinerary = internalDestinationMutation({
  args: { extraDays: v.number() },
  returns: v.object({
    endDay: v.number(),
    extraDays: v.number(),
    startDay: v.number(),
    totalDurationDays: v.number()
  }),
  handler: async (ctx, { extraDays }) => {
    assertAgentCanWrite(ctx);
    return await TripDestination.fromCtx(ctx).extendByDays(extraDays);
  }
});

export const addActivity = internalTripMutation({
  args: TripActivityValidators.addArgs,
  returns: v.id('tripDestinationActivities'),
  handler: async (ctx, { destinationId, input }) => {
    assertAgentCanWrite(ctx);
    return await ItineraryActivity.add(ctx, ctx.trip._id, destinationId, input);
  }
});

export const addStay = internalTripMutation({
  args: TripStayValidators.addArgs,
  returns: v.id('tripDestinationStays'),
  handler: async (ctx, { destinationId, input }) => {
    assertAgentCanWrite(ctx);
    return await TripStay.add(ctx, ctx.trip._id, destinationId, input);
  }
});

export const setItineraryCost = internalTripMutation({
  args: {
    amount: v.union(v.number(), v.null()),
    split: v.optional(tripCostSplitValidator),
    target: itineraryCostTargetValidator
  },
  returns: v.null(),
  handler: async (ctx, { amount, split, target }) => {
    assertAgentCanWrite(ctx);
    const normalizedAmount = normalizeCost(amount ?? undefined, 'itinerary cost');
    const cost =
      normalizedAmount === undefined
        ? undefined
        : {
            amount: normalizedAmount,
            split: split === undefined ? undefined : tripCostSplit(split)
          };
    const { currentAmount, currentSplit, eventType } = await TripTargets.setCost(
      ctx,
      ctx.trip._id,
      target,
      cost
    );
    // An omitted split keeps the current one (setCost would otherwise drop it to the default).
    if (cost && split === undefined) {
      await TripTargets.setCost(ctx, ctx.trip._id, target, { ...cost, split: currentSplit });
    }
    if (currentAmount === normalizedAmount && currentSplit === (split ?? currentSplit)) {
      return null;
    }
    await patchTrip(ctx, { updatedAt: Date.now() });
    await recordActivity(ctx, eventType, `${ctx.workspace.viewerName} updated an itinerary cost`);
    return null;
  }
});
