import type { Icon } from '@groam/icons';
import type { useTripPolls } from '@/features/polls/hooks/use-polls';
import type { useQueueLedger } from '@/features/trip-queue/hooks/use-queue-ledger';
import type { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import type { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import type { IdeaStatus } from '@/types/ideas';
import type { IssueCondition, IssueStatus } from '@/types/issues';
import type { RouteTarget } from '@/types/navigation';
import type { Poll } from '@/types/polls';

/** The three kinds of open thing a trip keeps: each has its own section and queue. */
export type QueueKind = 'idea' | 'issue' | 'poll';

/** The trip sections that list one kind each. */
export type QueueSection = 'ideas' | 'issues' | 'polls';

export type QueueTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

/** Who an item belongs to, for the row's avatar: an assignee, an author, or a poll's creator. */
export type QueuePerson = { kind: 'agent' | 'user'; mine: boolean; name: string };

export type QueueBase = {
  /** Ideas only: the lifecycle value, independent of the row's display label. */
  ideaStatus?: IdeaStatus;
  /** Ideas only: stable author identity for filter values. */
  authorKey?: string;
  /** Issues only: the viewer may assign it (organizers, live trips). */
  canAssign?: true;
  /** Issues only: the viewer may change its status and due date. */
  canManage?: true;
  /** Issues only: its auto condition, which can refuse a status change. */
  condition?: IssueCondition;
  /** Issues only: the lifecycle status behind the row's label. */
  issueStatus?: IssueStatus;
  /** Issues only: the viewer holds it. */
  assignedToViewer?: true;
  /** Issues only: a stable key for who holds it (`user:<id>` or `agent:<id>`); absent when unassigned. */
  assigneeKey?: string;
  /** One quiet line after the title: an issue's body, else the `who` phrase. */
  excerpt: string;
  /** The row's status glyph; tinted by `status.tone`. */
  icon: Icon;
  /** Issues only: the idea started from it. */
  ideaTitle?: string;
  /** When it is due: an issue's decide-by date, or when an open poll closes. Never set once settled. */
  dueAt?: number;
  id: string;
  /** An issue the trip needs settled before it can go ahead. */
  mandatory?: true;
  /** Who the avatar shows; null when nobody holds the item. */
  person: QueuePerson | null;
  /** Done: an issue resolved, an idea applied or closed, a poll closed. */
  settled: boolean;
  status: { label: string; tone: QueueTone };
  title: string;
  updatedAt: number;
  /** Who it concerns, as a phrase: "Assigned to Ana", "By Sam", "Asked by Ana". */
  who: string;
  /** Whether the item waits on the viewer. Always false on an archived trip. */
  yourTurn: boolean;
};

/** One row of a trip's Ideas, Issues, or Polls queue: issues and ideas open a page, polls expand into their card. */
export type QueueItem =
  | (QueueBase & { href: RouteTarget; kind: 'idea' | 'issue' })
  | (QueueBase & { kind: 'poll'; poll: Poll });

/** What the queue orders by: whose turn, when it is due, when it last changed. */
export type QueueOrdered = Pick<QueueItem, 'dueAt' | 'updatedAt' | 'yourTurn'>;

/** An issue as the trip's issue list returns it. */
export type QueueIssue = NonNullable<ReturnType<typeof useTripIssues>['issues']>[number];

/** An idea as the trip's idea list returns it. */
export type QueueIdea = NonNullable<ReturnType<typeof useTripVersions>['proposals']>[number];

/** A trip's polls with their paging, as `useTripPolls` returns them. */
export type PollFeed = ReturnType<typeof useTripPolls>;

/** A run of rows under one quiet heading; no heading when the list needs none. */
export type QueueGroup = { items: readonly QueueItem[]; label: string | null };

/** What a row needs to know about the ledger it sits in: the keyboard cursor and the selection. */
export type QueueRowLedger = {
  /** Anything is selected, so every checkbox shows. */
  anySelected: boolean;
  /** The keyboard cursor is on this row. */
  cursor: boolean;
  /** A poll shows its options in place. */
  expanded: boolean;
  onCursor: () => void;
  onToggleExpanded: () => void;
  /** Absent when the row cannot be selected. */
  onToggleSelect?: () => void;
  selected: boolean;
};

/** The ledger's cursor, selection, and folded groups, as `useQueueLedger` returns them. */
export type QueueLedgerState = ReturnType<typeof useQueueLedger>;
