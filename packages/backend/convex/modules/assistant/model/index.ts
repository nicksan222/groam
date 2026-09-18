import { updateThreadMetadata } from '@convex-dev/agent';
import {
  assistantThreadSummary,
  parseAssistantThreadSummary
} from '@groam/ai-contracts/agents/registry';
import { ConvexError, v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { internalWorkspaceQuery, requireWorkspace } from '#convex/modules/auth/workspace';
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
import { components } from '#convex-generated/api';
import { internalMutation, internalQuery } from '#convex-generated/server';
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

export const access = internalQuery({
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
        tags,
        threadTitle: thread.title ?? null,
        userId: workspace.tokenIdentifier
      };
    }
    const workspace = await requireWorkspace(ctx);
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
    return await TripTargets.contextCatalog(ctx, trips);
  }
});

export const taggedContext = internalQuery({
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
    return await Promise.all(
      references.map(async (reference) => {
        const resolved = await TripTargets.resolveContextTag(
          ctx,
          workspace.organizationId,
          reference
        );
        const details =
          reference.kind === 'trip'
            ? await AssistantTripContext.load(ctx, reference.id)
            : await TripTargets.contextDetails(ctx, workspace.organizationId, reference);
        return { ...resolved, details: JSON.stringify(details) };
      })
    );
  }
});

export const setScreenContext = internalMutation({
  args: {
    screenContext: v.string(),
    threadId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, { screenContext, threadId }) => {
    const { tags, workspace } = await AssistantThreads.require(ctx, threadId, 'private');
    await updateThreadMetadata(ctx, components.agent, {
      patch: {
        summary: assistantThreadSummary(workspace.organizationId, tags, Date.now(), screenContext)
      },
      threadId
    });
    return null;
  }
});

export const setContextTags = internalMutation({
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
    const { thread, workspace } = await AssistantThreads.require(ctx, threadId, scope);
    const unique = tags.filter(
      (tag, index) =>
        tags.findIndex((candidate) => candidate.kind === tag.kind && candidate.id === tag.id) ===
        index
    );
    const resolved = await Promise.all(
      unique.map((tag) => TripTargets.resolveContextTag(ctx, workspace.organizationId, tag))
    );
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
  handler: (ctx, { body, title }) =>
    TripIssues.createAssignedToIssueAgent(ctx, ctx.trip._id, title, body)
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
        : { amount: normalizedAmount, split: tripCostSplit(split) };
    const { currentAmount, currentSplit, eventType } = await TripTargets.setCost(
      ctx,
      ctx.trip._id,
      target,
      cost
    );
    if (currentAmount === normalizedAmount && currentSplit === (cost?.split ?? currentSplit)) {
      return null;
    }
    await patchTrip(ctx, { updatedAt: Date.now() });
    await recordActivity(ctx, eventType, `${ctx.workspace.viewerName} updated an itinerary cost`);
    return null;
  }
});
