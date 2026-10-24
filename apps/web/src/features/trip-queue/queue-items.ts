import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import {
  isIdeaYourTurn,
  isIssueYourTurn,
  isPollYourTurn,
  isViewerDraft,
  isVisibleIdea
} from '@groam/backend/convex/modules/travel/turn';
import type { Id } from '@groam/backend/data-model';
import {
  Ban,
  CircleCheck,
  FileEdit,
  GitMerge,
  Lightbulb,
  TriangleAlert,
  Vote,
  type Icon
} from '@groam/icons';
import type { ParsedListSearch } from '@groam/ui/components/list';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ideaStatusLabel, isIdeaSettled } from '@/features/ideas/idea-status';
import { issueStatusMeta } from '@/features/issues/issue-status';
import { matchesQueueFilters } from '@/features/trip-queue/queue-search-filters';
import { queueKindSection } from '@/features/trip-queue/queue-sections';
import type { TurnItem } from '@/types/dashboard';
import type { IdeaStatus } from '@/types/ideas';
import type { IssueStatus } from '@/types/issues';
import type { RouteTarget } from '@/types/navigation';
import type { Poll } from '@/types/polls';
import type { QueueIdea, QueueIssue, QueueItem, QueueOrdered, QueueTone } from '@/types/queue';

export type { QueueIdea, QueueIssue };

const issueTones: Record<IssueStatus, QueueTone> = {
  closed: 'success',
  in_progress: 'warning',
  open: 'info',
  wont_do: 'neutral'
};

const ideaIcons: Record<IdeaStatus, Icon> = {
  closed: Ban,
  conflicted: TriangleAlert,
  draft: FileEdit,
  in_review: Lightbulb,
  merged: GitMerge
};

const ideaTones: Record<IdeaStatus, QueueTone> = {
  closed: 'neutral',
  conflicted: 'danger',
  draft: 'neutral',
  in_review: 'info',
  merged: 'success'
};

/** The pill an issue wears in a queue or in Home's list. */
function issueQueueStatus(status: IssueStatus) {
  return { label: issueStatusMeta[status].label, tone: issueTones[status] };
}

/** The pill an idea wears; the viewer's own draft reads "Your draft". */
function ideaQueueStatus(status: IdeaStatus, mine: boolean) {
  return { label: mine ? 'Your draft' : ideaStatusLabel(status), tone: ideaTones[status] };
}

/** The pill an open poll wears. */
const pollQueueStatus = { label: 'Voting', tone: 'info' } as const satisfies {
  label: string;
  tone: QueueTone;
};

/** Who an issue concerns, with the viewer named "you"; an unassigned issue says so. */
function issueWho(issue: QueueIssue, viewerUserId: string | null | undefined) {
  const assignee = issue.assignee;
  if (assignee) {
    const mine = assignee.kind === 'user' && assignee.userId === viewerUserId;
    return `Assigned to ${mine ? 'you' : assignee.name}`;
  }
  const author = issue.author.userId === viewerUserId ? 'you' : issue.author.name;
  return `Unassigned · opened by ${author}`;
}

/** Stable key for one assignee, for the Assignee filter. */
function assigneeKey(assignee: NonNullable<QueueIssue['assignee']>) {
  return assignee.kind === 'user' ? `user:${assignee.userId}` : `agent:${assignee.agentId}`;
}

/** An issue's body as one line; with no body, the fallback phrase. */
function excerptOf(body: string | undefined, fallback: string) {
  return (body ?? '').replaceAll(/\s+/gu, ' ').trim() || fallback;
}

function issueItem(
  issue: QueueIssue,
  viewerUserId: string | null | undefined,
  writable: boolean
): QueueItem {
  const settled = isResolved(issue.status);
  const who = issueWho(issue, viewerUserId);
  const assignee = issue.assignee;
  const mine = assignee?.kind === 'user' && assignee.userId === viewerUserId;
  return {
    ...(issue.canAssign ? { canAssign: true as const } : {}),
    ...(issue.canManage ? { canManage: true as const } : {}),
    ...(issue.condition ? { condition: issue.condition } : {}),
    issueStatus: issue.status,
    ...(assignee ? { assigneeKey: assigneeKey(assignee) } : {}),
    ...(mine ? { assignedToViewer: true as const } : {}),
    ...(issue.dueAt === null || settled ? {} : { dueAt: issue.dueAt }),
    excerpt: excerptOf(issue.body, who),
    href: { params: { issueId: issue.id }, to: '/issues/$issueId' },
    icon: issueStatusMeta[issue.status].icon,
    id: issue.id,
    ...(issue.idea ? { ideaTitle: issue.idea.title } : {}),
    kind: 'issue',
    ...(issue.labels.includes('mandatory') ? { mandatory: true as const } : {}),
    person: assignee ? { kind: assignee.kind, mine, name: assignee.name } : null,
    settled,
    status: issueQueueStatus(issue.status),
    title: issue.title,
    updatedAt: issue.updatedAt,
    who,
    yourTurn: writable && isIssueYourTurn(issue, viewerUserId)
  };
}

function ideaItem(
  idea: QueueIdea,
  tripId: Id<'trips'>,
  viewerUserId: string | null | undefined,
  writable: boolean
): QueueItem {
  const mine = isViewerDraft(idea, viewerUserId);
  const who = `By ${idea.author.userId === viewerUserId ? 'you' : idea.author.name}${idea.issueId ? ' · from an issue' : ''}`;
  return {
    authorKey: idea.author.userId,
    ideaStatus: idea.status,
    excerpt: who,
    href: ideaOpenHref(
      {
        author: idea.author,
        id: idea.id,
        sourceTripId: tripId,
        status: idea.status,
        workingTripId: idea.workingTripId
      },
      viewerUserId
    ),
    icon: ideaIcons[idea.status],
    id: idea.id,
    kind: 'idea',
    person: { kind: 'user', mine: idea.author.userId === viewerUserId, name: idea.author.name },
    settled: isIdeaSettled(idea.status),
    status: ideaQueueStatus(idea.status, mine),
    title: idea.title,
    updatedAt: idea.updatedAt,
    who,
    yourTurn: writable && isIdeaYourTurn(idea, viewerUserId)
  };
}

function pollItem(poll: Poll, writable: boolean): QueueItem {
  const closed = poll.status === 'closed';
  return {
    ...(poll.closesAt === null || closed ? {} : { dueAt: poll.closesAt }),
    excerpt: `Asked by ${poll.createdBy.name}`,
    icon: closed ? CircleCheck : Vote,
    id: poll.id,
    kind: 'poll',
    person: { kind: poll.createdBy.kind, mine: false, name: poll.createdBy.name },
    poll,
    settled: closed,
    status: closed ? { label: 'Closed', tone: 'neutral' } : pollQueueStatus,
    title: poll.question,
    updatedAt: poll.updatedAt,
    who: `Asked by ${poll.createdBy.name}`,
    yourTurn: writable && isPollYourTurn(poll)
  };
}

/** Waiting on the viewer first, dated before undated and soonest first; then the most recently touched. */
export function compareQueueItems(left: QueueOrdered, right: QueueOrdered) {
  if (left.yourTurn !== right.yourTurn) return left.yourTurn ? -1 : 1;
  if (left.yourTurn) {
    const leftDated = left.dueAt !== undefined;
    if (leftDated !== (right.dueAt !== undefined)) return leftDated ? -1 : 1;
    if (left.dueAt !== undefined && right.dueAt !== undefined && left.dueAt !== right.dueAt) {
      return left.dueAt - right.dueAt;
    }
  }
  return right.updatedAt - left.updatedAt;
}

/** Merges a trip's issues, ideas, and polls into one queue, sorted by whose turn it is. */
export function buildQueueItems({
  archived,
  ideas,
  issues,
  polls,
  tripId,
  viewerUserId
}: {
  archived: boolean;
  ideas: readonly QueueIdea[];
  issues: readonly QueueIssue[];
  polls: readonly Poll[];
  tripId: Id<'trips'>;
  viewerUserId: string | null | undefined;
}): QueueItem[] {
  const writable = !archived;
  return [
    ...issues.map((issue) => issueItem(issue, viewerUserId, writable)),
    ...ideas
      .filter((idea) => isVisibleIdea(idea, viewerUserId))
      .map((idea) => ideaItem(idea, tripId, viewerUserId, writable)),
    ...polls.map((poll) => pollItem(poll, writable))
  ].toSorted(compareQueueItems);
}

/**
 * The slice of a queue a parsed search asks for: free text matches titles, and the `key:value`
 * filters narrow by status, author, turn, assignee, or flags, each kind in its own way. `slugs`
 * maps the person values to people (`queueSearchFilters(...).slugs`).
 */
export function filterQueueItems(
  items: readonly QueueItem[],
  { parsed, slugs }: { parsed: ParsedListSearch; slugs: ReadonlyMap<string, string> }
): QueueItem[] {
  const needle = parsed.text.toLocaleLowerCase();
  return items.filter(
    (item) =>
      (!needle || item.title.toLocaleLowerCase().includes(needle)) &&
      matchesQueueFilters(item, parsed, slugs)
  );
}

/**
 * Where a row of Home's "Your turn" list opens and the pill it wears, the same as the row of the
 * same item in its trip's queue. A poll opens in place in its queue, so its row leads to the
 * viewer's polls. Links name the trip by its short id when it has one.
 */
export function turnItemPresentation(
  item: TurnItem,
  viewerUserId: string | null | undefined
): { href: RouteTarget; status: QueueItem['status'] } {
  const tripReference = item.tripShortId ?? item.tripId;
  if (item.kind === 'issue') {
    return {
      href: { params: { issueId: item.id }, to: '/issues/$issueId' },
      status: issueQueueStatus(item.status)
    };
  }
  if (item.kind === 'idea') {
    const href = ideaOpenHref(
      {
        author: { userId: item.authorUserId },
        id: item.id,
        sourceTripId: item.tripId,
        status: item.status,
        workingTripId: item.workingTripId
      },
      viewerUserId
    );
    return {
      href:
        'search' in href ? { ...href, params: { ...href.params, tripId: tripReference } } : href,
      status: ideaQueueStatus(
        item.status,
        isViewerDraft({ author: { userId: item.authorUserId }, status: item.status }, viewerUserId)
      )
    };
  }
  return {
    href: {
      params: { section: queueKindSection.poll, tripId: tripReference },
      to: '/trips/$tripId/$section'
    },
    status: pollQueueStatus
  };
}
