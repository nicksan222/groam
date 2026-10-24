import type { Id } from '@groam/backend/data-model';
import type { IssueDetailData } from '@/features/issues/issue-detail/issue-detail-data';

/** A readable issue as its own page loads it; override what a test cares about. */
export const issueDetailData = (over: Partial<IssueDetailData> = {}): IssueDetailData => ({
  about: null,
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  body: 'Add a coast day near Lisbon.',
  canAssign: true,
  canComment: true,
  canManage: true,
  closedAt: null,
  comments: [],
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  shortId: 'isuabc',
  status: 'open',
  subjectMissing: false,
  title: 'Coast day',
  tripId: 'trip-1' as Id<'trips'>,
  tripName: 'Atlantic week',
  updatedAt: Date.UTC(2026, 7, 17),
  ...over
});
