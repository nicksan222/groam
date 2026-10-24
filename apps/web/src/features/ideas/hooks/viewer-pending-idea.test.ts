import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vite-plus/test';
import type { ViewerIdea } from '@/types/ideas';
import { findViewerDrafts, findViewerOpenIdeas } from './viewer-pending-idea';

function idea(
  value: Pick<ViewerIdea, 'id' | 'status' | 'title'> & Partial<ViewerIdea>
): ViewerIdea {
  return { author: { userId: 'user-alex' }, updatedAt: 1, ...value };
}

const viewerDraft = idea({
  id: 'idea-mine' as Id<'tripProposals'>,
  status: 'draft',
  title: 'Extend the stay',
  updatedAt: 30
});
const otherDraft = idea({
  author: { userId: 'user-sam' },
  id: 'idea-other' as Id<'tripProposals'>,
  status: 'draft',
  title: 'Add a museum morning',
  updatedAt: 40
});
const viewerReview = idea({
  id: 'idea-review' as Id<'tripProposals'>,
  status: 'in_review',
  title: 'Share the coast day',
  updatedAt: 20
});
const viewerMerged = idea({
  id: 'idea-merged' as Id<'tripProposals'>,
  status: 'merged',
  title: 'Already applied',
  updatedAt: 50
});

describe('viewer pending ideas', () => {
  test('lists only the viewer’s open ideas, newest first', () => {
    const proposals = [otherDraft, viewerReview, viewerMerged, viewerDraft];
    expect(findViewerOpenIdeas(proposals, 'user-alex').map(({ id }) => id)).toEqual([
      'idea-mine',
      'idea-review'
    ]);
  });

  test('lists only drafts for the drafts finder', () => {
    const proposals = [otherDraft, viewerReview, viewerDraft];
    expect(findViewerDrafts(proposals, 'user-alex').map(({ id }) => id)).toEqual(['idea-mine']);
  });

  test('finds nothing without a viewer', () => {
    expect(findViewerOpenIdeas([viewerDraft], null)).toEqual([]);
    expect(findViewerDrafts([viewerDraft], undefined)).toEqual([]);
  });
});
