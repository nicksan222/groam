import { createThread, updateThreadMetadata } from '@convex-dev/agent';
import { assistantThreadSummary } from '@groam/ai/runtime/thread-summary';
import { ConvexError } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { Messages } from '#convex/modules/discussions/messages/index';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { Discussions, normalizeTitle } from '#convex/modules/discussions/threads/index';
import {
  discussionRateLimiter,
  MAX_RESEARCH_BRIEF_LENGTH,
  MAX_RESEARCHES_PER_TRIP,
  MAX_RESEARCH_TITLE_LENGTH
} from '#convex/modules/discussions/threads/limits';
import { insertWithShortId } from '#convex/modules/references/index';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';

const PURGE_BATCH_SIZE = 50;
const INLINE_PURGE_STEPS = 6;

type ResearchDoc = Extract<Doc<'discussions'>, { kind: 'research' }>;

function normalizeBrief(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? '';
  if (normalized.length > MAX_RESEARCH_BRIEF_LENGTH) {
    throw new ConvexError(
      `Research briefs must be at most ${MAX_RESEARCH_BRIEF_LENGTH} characters`
    );
  }
  return normalized.length === 0 ? undefined : normalized;
}

async function requireResearch(
  ctx: MutationCtx | QueryCtx,
  discussionId: Id<'discussions'>
): Promise<{ access: DiscussionAccess; research: ResearchDoc }> {
  const access = await DiscussionAccess.require(ctx, discussionId);
  if (access.discussion.kind !== 'research') throw new ConvexError('Discussion not found');
  return { access, research: access.discussion };
}

/** Trip research: one subject, open to everyone who can see the trip. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class Research {
  static async create(
    ctx: MutationCtx,
    input: { brief?: string; clientRequestId: string; title: string; tripId: Id<'trips'> }
  ): Promise<Id<'discussions'>> {
    const workspace = await requireWorkspace(ctx);
    const title = normalizeTitle(input.title, MAX_RESEARCH_TITLE_LENGTH);
    const brief = normalizeBrief(input.brief);
    const clientRequestId = Messages.normalizeRequestId(input.clientRequestId, 'Discussion');
    const [{ trip }, existing] = await Promise.all([
      loadTripContext(ctx, input.tripId, workspace),
      ctx.db
        .query('discussions')
        .withIndex('by_organizationId_and_createdBy_userId_and_clientRequestId', (query) =>
          query
            .eq('organizationId', workspace.organizationId)
            .eq('createdBy.userId', workspace.userId)
            .eq('clientRequestId', clientRequestId)
        )
        .unique()
    ]);
    if (existing) {
      if (
        existing.kind !== 'research' ||
        existing.tripId !== trip._id ||
        existing.title !== title ||
        existing.brief !== brief
      ) {
        throw new ConvexError('Discussion request id was already used');
      }
      return existing._id;
    }
    if (trip.archive !== undefined) throw new ConvexError('This trip is archived');
    const inTrip = await ctx.db
      .query('discussions')
      .withIndex('by_tripId_and_kind_and_updatedAt', (query) =>
        query.eq('tripId', trip._id).eq('kind', 'research')
      )
      .take(MAX_RESEARCHES_PER_TRIP);
    if (inTrip.length >= MAX_RESEARCHES_PER_TRIP) {
      throw new ConvexError(`A trip can have up to ${MAX_RESEARCHES_PER_TRIP} researches`);
    }
    await discussionRateLimiter.limit(ctx, 'discussionCreate', {
      key: workspace.tokenIdentifier,
      throws: true
    });
    const now = Date.now();
    const [discussionId, threadId] = await Promise.all([
      insertWithShortId(ctx, 'discussions', {
        ...(brief === undefined ? {} : { brief }),
        clientRequestId,
        createdBy: { name: workspace.viewerName, userId: workspace.userId },
        kind: 'research' as const,
        linkCount: 0,
        organizationId: workspace.organizationId,
        participantCount: 1,
        title,
        tripId: trip._id,
        updatedAt: now
      }),
      createThread(ctx, components.agent, {
        summary: assistantThreadSummary(workspace.organizationId, [], now),
        title
      })
    ]);
    await ctx.db.patch('discussions', discussionId, { threadId });
    await ctx.db.insert('discussionMembers', {
      discussionId,
      kind: 'research',
      lastReadAt: now,
      organizationId: workspace.organizationId,
      userId: workspace.userId
    });
    return discussionId;
  }

  static async get(ctx: QueryCtx, discussionId: Id<'discussions'>) {
    const { access, research } = await requireResearch(ctx, discussionId);
    return {
      brief: research.brief ?? null,
      canManage: access.canManage,
      createdBy: research.createdBy,
      id: research._id,
      kind: research.kind,
      lastMessage: research.lastMessage ?? null,
      links: await DiscussionLinks.resolved(ctx, research._id),
      shortId: research.shortId,
      threadId: research.threadId ?? null,
      title: research.title,
      tripId: research.tripId,
      updatedAt: research.updatedAt,
      writable: access.trip?.archive === undefined
    };
  }

  /** Subject and brief. Only fields that are passed change; an empty brief clears it. */
  static async update(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    patch: { brief?: string; title?: string }
  ): Promise<null> {
    const { access, research } = await requireResearch(ctx, discussionId);
    access.assertCanManage();
    access.assertWritable();
    const title =
      patch.title === undefined
        ? undefined
        : normalizeTitle(patch.title, MAX_RESEARCH_TITLE_LENGTH);
    const brief = patch.brief === undefined ? undefined : (normalizeBrief(patch.brief) ?? '');
    await ctx.db.patch('discussions', research._id, {
      ...(title === undefined ? {} : { title }),
      ...(brief === undefined ? {} : { brief: brief === '' ? undefined : brief })
    });
    if (title !== undefined && title !== research.title && research.threadId) {
      await updateThreadMetadata(ctx, components.agent, {
        patch: { title },
        threadId: research.threadId
      });
    }
    return null;
  }

  /** Removes the research, its messages, participation, reactions, pins, and links. */
  static async remove(ctx: MutationCtx, discussionId: Id<'discussions'>): Promise<null> {
    const { access, research } = await requireResearch(ctx, discussionId);
    access.assertCanManage();
    access.assertWritable();
    // From here the research is unreachable, even while its rows are still being purged.
    await ctx.db.patch('discussions', research._id, { deletingAt: Date.now() });
    // Small researches finish in this transaction; the rest continues in the background.
    let more = true;
    for (let step = 0; more && step < INLINE_PURGE_STEPS; step += 1) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each batch deletes what the last one left.
      more = await Discussions.purge(ctx, research, PURGE_BATCH_SIZE);
    }
    if (more) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.discussions.threads.cleanup.purgeDiscussion,
        { discussionId }
      );
    }
    return null;
  }

  /** Researches of one trip, newest activity first. */
  static async listForTrip(ctx: QueryCtx, tripId: Id<'trips'>, kind: Doc<'discussions'>['kind']) {
    const workspace = await requireWorkspace(ctx);
    await loadTripContext(ctx, tripId, workspace);
    if (kindPolicy(kind).home !== 'trip') return [];
    const rows = await ctx.db
      .query('discussions')
      .withIndex('by_tripId_and_kind_and_updatedAt', (query) =>
        query.eq('tripId', tripId).eq('kind', kind)
      )
      .order('desc')
      .take(MAX_RESEARCHES_PER_TRIP);
    const listed = await Promise.all(
      rows.map(async (row) => {
        // The literal narrows to the research variant, which carries the counts.
        if (
          row.organizationId !== workspace.organizationId ||
          row.kind !== 'research' ||
          row.deletingAt !== undefined
        ) {
          return null;
        }
        const mine = await ctx.db
          .query('discussionMembers')
          .withIndex('by_discussionId_and_userId', (query) =>
            query.eq('discussionId', row._id).eq('userId', workspace.userId)
          )
          .unique();
        return {
          brief: row.brief ?? null,
          id: row._id,
          kind: row.kind,
          lastMessage: row.lastMessage ?? null,
          linkCount: row.linkCount,
          participantCount: row.participantCount,
          shortId: row.shortId,
          title: row.title,
          tripId,
          unread:
            mine?.lastReadAt === undefined
              ? row.lastMessage !== undefined
              : mine.lastReadAt < row.updatedAt,
          updatedAt: row.updatedAt
        };
      })
    );
    return listed.filter((row): row is NonNullable<typeof row> => row !== null);
  }
}
