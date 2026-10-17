import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

const author = v.object({ name: v.string(), userId: v.string() });

/** Itinerary items a research may point at. Kept to the three kinds a traveler researches. */
const tripTarget = v.union(
  v.object({ id: v.id('tripDestinations'), type: v.literal('destination') }),
  v.object({ id: v.id('tripDestinationActivities'), type: v.literal('activity') }),
  v.object({ id: v.id('tripDestinationStays'), type: v.literal('stay') })
);

const linkTarget = v.union(
  v.object({ issueId: v.id('tripIssues'), kind: v.literal('issue') }),
  v.object({ kind: v.literal('idea'), proposalId: v.id('tripProposals') }),
  v.object({ kind: v.literal('tripTarget'), target: tripTarget })
);

const resolvedLink = v.object({
  id: v.id('discussionLinks'),
  kind: v.union(
    v.literal('issue'),
    v.literal('idea'),
    v.literal('destination'),
    v.literal('activity'),
    v.literal('stay')
  ),
  label: v.string(),
  shortId: v.union(v.string(), v.null()),
  target: linkTarget,
  targetKey: v.string()
});

export const DiscussionLinkValidators = {
  linkedResearch: v.object({
    id: v.id('discussions'),
    kind: v.literal('research'),
    shortId: v.string(),
    title: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number()
  }),
  resolvedLink,
  target: linkTarget,
  tripTarget
};

export type DiscussionLinkTarget = Infer<typeof linkTarget>;

export const discussionLinkTables = {
  discussionLinks: defineTable({
    createdBy: author,
    discussionId: v.id('discussions'),
    organizationId: v.string(),
    target: linkTarget,
    /** "issue:<id>" | "idea:<id>" | "destination:<id>" ...; reverse lookup and dedupe. */
    targetKey: v.string(),
    tripId: v.id('trips')
  })
    .index('by_discussionId', ['discussionId'])
    .index('by_targetKey', ['targetKey'])
    .index('by_discussionId_and_targetKey', ['discussionId', 'targetKey'])
    .index('by_tripId', ['tripId'])
};
