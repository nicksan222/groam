import type { Id } from '@groam/backend/data-model';
import { workspaceIssue } from '@/features/issues/issue-fixtures';
import type {
  TripBoardIdea,
  TripBoardIdeaItem,
  TripBoardIssue,
  TripBoardIssueItem,
  TripBoardRights
} from '@/types/trip-board';

/** A board issue; `id` doubles as the title so tests can find the card by name. */
export const boardIssue = (id: string, over: Partial<TripBoardIssue> = {}): TripBoardIssue =>
  workspaceIssue({ id: id as Id<'tripIssues'>, title: id, ...over });

export const boardIdea = (id: string, over: Partial<TripBoardIdea> = {}): TripBoardIdea => ({
  author: { name: 'Sam', userId: 'user-sam' },
  baseUpdatedAt: 0,
  canApprove: false,
  canMerge: false,
  conflictCount: 0,
  feedbackCount: 0,
  hasApproved: false,
  id: id as Id<'tripProposals'>,
  ideaName: id,
  issueId: null,
  status: 'in_review',
  submittedAt: null,
  title: id,
  unresolvedFeedbackCount: 0,
  updatedAt: Date.now(),
  workingTripId: 'trip-work' as Id<'trips'>,
  ...over
});

/** A lifted issue card; pass `archived` or `canPropose` to change what the viewer may do. */
export const issueItem = (
  over: Partial<TripBoardIssue> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIssueItem => ({
  archived,
  canPropose,
  issue: boardIssue('issue-1', over),
  kind: 'issue'
});

export const ideaItem = (
  over: Partial<TripBoardIdea> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIdeaItem => ({ archived, canPropose, idea: boardIdea('idea-1', over), kind: 'idea' });
