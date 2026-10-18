import type { api } from '@groam/backend/api';
import type {
  IssueRule,
  RuleClause,
  RuleMatch
} from '@groam/backend/convex/modules/travel/issues/rules/index';
import type { FunctionReturnType } from 'convex/server';

export type { IssueEvent } from '@groam/backend/convex/modules/travel/issues/events';

export type WorkspaceIssue = FunctionReturnType<
  typeof api.routes.trips.issues.workspace.list.run
>['page'][number];

export type IssueStatus = WorkspaceIssue['status'];

/**
 * What closes an issue: a `rule` the system checks against the shared trip (a locked `starter` or
 * one a person composed), or a `manual` line a person wrote, closed by hand (`met` null).
 */
export type IssueCondition = NonNullable<WorkspaceIssue['condition']>;

export type IssueListItem = Pick<
  WorkspaceIssue,
  | 'assignee'
  | 'author'
  | 'canAssign'
  | 'canManage'
  | 'condition'
  | 'dueAt'
  | 'id'
  | 'idea'
  | 'labels'
  | 'rank'
  | 'shortId'
  | 'status'
  | 'title'
  | 'updatedAt'
> &
  Partial<Pick<WorkspaceIssue, 'tripName'>>;

/** What an issue card needs to render; every issue list shape satisfies it. */
export type IssueCardData = Pick<
  IssueListItem,
  'assignee' | 'condition' | 'dueAt' | 'id' | 'idea' | 'labels' | 'status' | 'title' | 'updatedAt'
>;

export type IssueLabel = WorkspaceIssue['labels'][number];

/** Who an issue can be assigned to; `null` unassigns. */
export type IssueAssigneeInput = NonNullable<WorkspaceIssue['assignee']>;

/**
 * List filter keys. `open` groups the active statuses (to decide and in progress), `closed`
 * groups the resolved ones (done and won't do); `in_progress` and `wont_do` narrow to one.
 */
export type IssueStatusFilter = 'all' | 'closed' | 'in_progress' | 'open' | 'wont_do';

export type IssueListFilters = {
  query: string;
  status: IssueStatusFilter;
};

export type IssueDetailAgentContextInput = Pick<
  WorkspaceIssue,
  'id' | 'status' | 'title' | 'tripId' | 'tripName'
> &
  Partial<Pick<WorkspaceIssue, 'condition'>>;

/** A composed "done when" the system checks against the shared trip; see the backend `rules/`. */
export type {
  ClauseField,
  ClauseKind
} from '@groam/backend/convex/modules/travel/issues/rules/index';
export type { IssueRule, RuleClause, RuleMatch };

export type PresentedIssueRule = Extract<IssueCondition, { kind: 'rule' }>;

/** What a person sets as an issue's "done when"; neither field clears it. */
export type IssueConditionInput = { doneWhen?: string; rule?: IssueRule };

/** The editor's working copy of a rule: every row carries a stable key for React. */
export type RuleDraftClause = { clause: RuleClause; key: string };
export type RuleDraftItem =
  | (RuleDraftClause & { kind: 'clause' })
  | { clauses: Array<RuleDraftClause>; key: string; kind: 'group'; match: RuleMatch };
export type RuleDraftGroup = Extract<RuleDraftItem, { kind: 'group' }>;
export type RuleDraft = { items: Array<RuleDraftItem>; match: RuleMatch };

/** One choice in a rule select. */
export type RuleOption<V extends string> = { label: string; value: V };
