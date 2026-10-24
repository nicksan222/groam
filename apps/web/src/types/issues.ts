import type { api } from '@groam/backend/api';
import type {
  IssueRule,
  RuleClause,
  RuleMatch
} from '@groam/backend/convex/modules/travel/issues/rules/index';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

export type { IssueEvent } from '@groam/backend/convex/modules/travel/issues/events';

/** One issue as a trip's issue list reads it. */
export type TripIssue = FunctionReturnType<typeof api.routes.trips.issues.list.run>[number];

/** An issue as its own page reads it, with the trip it belongs to. */
export type IssueDetail = NonNullable<FunctionReturnType<typeof api.routes.trips.issues.get.run>>;

export type IssueStatus = TripIssue['status'];

/**
 * What closes an issue: a `rule` the system checks against the shared trip (a locked `starter` or
 * one a person composed), or a `manual` line a person wrote, closed by hand (`met` null).
 */
export type IssueCondition = NonNullable<TripIssue['condition']>;

export type IssueListItem = Pick<
  TripIssue,
  | 'assignee'
  | 'author'
  | 'canAssign'
  | 'canManage'
  | 'condition'
  | 'dueAt'
  | 'id'
  | 'idea'
  | 'labels'
  | 'shortId'
  | 'status'
  | 'title'
  | 'updatedAt'
>;

/** What an issue card needs to render; every issue list shape satisfies it. */
export type IssueCardData = Pick<
  IssueListItem,
  'assignee' | 'condition' | 'dueAt' | 'id' | 'idea' | 'labels' | 'status' | 'title' | 'updatedAt'
>;

export type IssueLabel = TripIssue['labels'][number];

/** Who an issue can be assigned to; `null` unassigns. */
export type IssueAssigneeInput = NonNullable<TripIssue['assignee']>;

export type IssueDetailAgentContextInput = Pick<
  IssueDetail,
  'id' | 'status' | 'title' | 'tripId' | 'tripName'
> &
  Partial<Pick<IssueDetail, 'condition'>>;

/** A composed "done when" the system checks against the shared trip; see the backend `rules/`. */
export type {
  ClauseField,
  ClauseKind
} from '@groam/backend/convex/modules/travel/issues/rules/index';
export type { IssueRule, RuleClause, RuleMatch };

export type PresentedIssueRule = Extract<IssueCondition, { kind: 'rule' }>;

/** The plan item an issue is about, as the create route takes it. */
export type IssueSubject = NonNullable<
  FunctionArgs<typeof api.routes.trips.issues.create.run>['subject']
>;

/**
 * A plan item to raise an issue about: the pointer, its name, and the phrase a question about it
 * starts from ("the taxi to Museum"). Not the same as the `about` an issue reads back.
 */
export type IssueFlagTarget = { label: string; subject: IssueSubject; topic: string };

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
