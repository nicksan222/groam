import type { Id } from '@groam/backend/data-model';
import { workspaceIssue } from '@/features/issues/issue-fixtures';
import type {
  TripBoardIdea,
  TripBoardIdeaItem,
  TripBoardIdeaLink,
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

/** An issue's pairing with an open idea titled `ideaTitle` in the Ideas lane. */
export const boardLink = (
  ideaTitle = 'Hostel',
  over: Partial<TripBoardIdeaLink> = {}
): TripBoardIdeaLink => ({
  idea: {
    id: ideaTitle as Id<'tripProposals'>,
    status: 'in_review',
    title: ideaTitle,
    workingTripId: 'trip-work' as Id<'trips'>
  },
  issueTitle: 'issue-1',
  tone: 0,
  ...over
});

/**
 * A lifted issue card; pass `archived` or `canPropose` to change what the viewer may do, and
 * `link` when open ideas already answer it.
 */
export const issueItem = (
  over: Partial<TripBoardIssue> = {},
  {
    archived = false,
    canPropose = true,
    link
  }: Partial<TripBoardRights> & { link?: TripBoardIdeaLink } = {}
): TripBoardIssueItem => ({
  archived,
  canPropose,
  issue: boardIssue('issue-1', over),
  kind: 'issue',
  ...(link ? { link } : {})
});

export const ideaItem = (
  over: Partial<TripBoardIdea> = {},
  { archived = false, canPropose = true }: Partial<TripBoardRights> = {}
): TripBoardIdeaItem => ({ archived, canPropose, idea: boardIdea('idea-1', over), kind: 'idea' });
