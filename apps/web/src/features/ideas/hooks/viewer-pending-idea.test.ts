import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import type { WorkspaceIdea } from './use-workspace-ideas';
import {
  findViewerDrafts,
  findViewerOpenIdeas,
  findViewerPendingIdea,
  isViewerOpenIdea,
  mergeViewerOpenIdeas,
  pendingIdeaContinueLabel,
  pinViewerOpenIdeas
} from './viewer-pending-idea';

function idea(
  value: Partial<WorkspaceIdea> & Pick<WorkspaceIdea, 'id' | 'status' | 'title'>
): WorkspaceIdea {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    ideaName: 'coast-day',
    reviewRequested: false,
    sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'Atlantic week',
    updatedAt: 1,
    workingTripId: 'working-1' as WorkspaceIdea['workingTripId'],
    ...value
  };
}

const viewerDraft = idea({
  id: 'idea-mine' as Id<'tripProposals'>,
  status: 'draft',
  title: 'Extend the stay',
  updatedAt: 30
});
const otherDraft = idea({
  author: { name: 'Sam Planner', userId: 'user-sam' },
  id: 'idea-other' as Id<'tripProposals'>,
  status: 'draft',
  title: 'Add a museum morning',
  updatedAt: 40
});
const viewerReview = idea({
  id: 'idea-review' as Id<'tripProposals'>,
  sourceTripId: 'trip-2' as WorkspaceIdea['sourceTripId'],
  status: 'in_review',
  title: 'Share the coast day',
  updatedAt: 20
});

describe('viewer pending ideas', () => {
  test('treats the viewer’s draft, in-review, and conflicted ideas as open', () => {
    expect(isViewerOpenIdea(viewerDraft, 'user-alex')).toBe(true);
    expect(isViewerOpenIdea(viewerReview, 'user-alex')).toBe(true);
    expect(isViewerOpenIdea(otherDraft, 'user-alex')).toBe(false);
    expect(isViewerOpenIdea(viewerDraft, null)).toBe(false);
  });

  test('finds the newest viewer open idea, or the one on a chosen trip', () => {
    const proposals = [otherDraft, viewerReview, viewerDraft];
    expect(findViewerOpenIdeas(proposals, 'user-alex').map(({ id }) => id)).toEqual([
      'idea-mine',
      'idea-review'
    ]);
    expect(findViewerDrafts(proposals, 'user-alex').map(({ id }) => id)).toEqual(['idea-mine']);
    expect(findViewerPendingIdea(proposals, 'user-alex')?.id).toBe('idea-mine');
    expect(findViewerPendingIdea(proposals, 'user-alex', 'trip-2')?.id).toBe('idea-review');
    expect(findViewerPendingIdea(proposals, 'user-alex', 'trip-missing')).toBeNull();
  });

  test('prefers a draft over a newer in-review idea', () => {
    const newerReview = { ...viewerReview, updatedAt: 99 };
    expect(findViewerPendingIdea([newerReview, viewerDraft], 'user-alex')?.id).toBe('idea-mine');
  });

  test('merges and pins the viewer’s draft above in-review and other ideas', () => {
    expect(
      mergeViewerOpenIdeas([otherDraft], [viewerDraft, otherDraft]).map(({ id }) => id)
    ).toEqual(['idea-mine', 'idea-other']);
    expect(
      pinViewerOpenIdeas(
        [{ ...viewerReview, updatedAt: 99 }, otherDraft, viewerDraft],
        'user-alex'
      ).map(({ id }) => id)
    ).toEqual(['idea-mine', 'idea-review', 'idea-other']);
  });

  test('keeps recent drafts first without reordering the query result', () => {
    const olderDraft = { ...viewerDraft, id: 'idea-older' as Id<'tripProposals'>, updatedAt: 5 };
    const proposals = [olderDraft, otherDraft, viewerDraft, viewerReview];
    expect(pinViewerOpenIdeas(proposals, 'user-alex').map(({ id }) => id)).toEqual([
      'idea-mine',
      'idea-older',
      'idea-review',
      'idea-other'
    ]);
    expect(proposals[0]).toBe(olderDraft);
  });

  test('labels draft continue actions separately from submitted ideas', () => {
    expect(pendingIdeaContinueLabel('draft')).toBe('Continue editing');
    expect(pendingIdeaContinueLabel('in_review')).toBe('Open review');
    expect(pendingIdeaContinueLabel('conflicted')).toBe('Open review');
  });
});
