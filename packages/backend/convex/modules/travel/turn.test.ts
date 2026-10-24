import { describe, expect, test } from 'vite-plus/test';
import {
  isIdeaYourTurn,
  isIssueYourTurn,
  isPollYourTurn,
  isViewerDraft,
  isViewerOpenIdea,
  isVisibleIdea
} from './turn';

const me = 'user-alex';
const idea = (status: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged', author = me) => ({
  author: { userId: author },
  status
});

describe('isIssueYourTurn', () => {
  test.each([
    [
      'open and assigned to the viewer',
      { assignee: { kind: 'user', userId: me }, status: 'open' },
      true
    ],
    [
      'in progress and assigned',
      { assignee: { kind: 'user', userId: me }, status: 'in_progress' },
      true
    ],
    ['closed', { assignee: { kind: 'user', userId: me }, status: 'closed' }, false],
    ['wont do', { assignee: { kind: 'user', userId: me }, status: 'wont_do' }, false],
    [
      'assigned to someone else',
      { assignee: { kind: 'user', userId: 'x' }, status: 'open' },
      false
    ],
    ['assigned to an agent', { assignee: { kind: 'agent' }, status: 'open' }, false],
    ['unassigned', { assignee: null, status: 'open' }, false]
  ] as const)('%s', (_name, issue, expected) => {
    expect(isIssueYourTurn(issue, me)).toBe(expected);
  });

  test('is never the turn of nobody', () => {
    const issue = { assignee: { kind: 'user', userId: me }, status: 'open' } as const;
    expect(isIssueYourTurn(issue, null)).toBe(false);
    expect(isIssueYourTurn(issue, undefined)).toBe(false);
  });
});

describe('isIdeaYourTurn', () => {
  test.each([
    ['a reviewer who can approve', { ...idea('in_review', 'x'), canApprove: true }, true],
    [
      'a reviewer who already approved',
      { ...idea('in_review', 'x'), canApprove: true, hasApproved: true },
      false
    ],
    ['a viewer who cannot approve', idea('in_review', 'x'), false],
    ['the author’s draft', idea('draft'), true],
    ['the author’s conflict', idea('conflicted'), true],
    ['the author’s idea in review', idea('in_review'), false],
    ['the author’s idea that can be applied', { ...idea('in_review'), canMerge: true }, true],
    [
      'another author’s idea that can be applied',
      { ...idea('in_review', 'x'), canMerge: true },
      false
    ],
    ['an applied idea', { ...idea('merged'), canApprove: true }, false]
  ])('%s', (_name, value, expected) => {
    expect(isIdeaYourTurn(value, me)).toBe(expected);
  });
});

describe('the viewer’s ideas', () => {
  test('open ideas are drafts, ideas in review and conflicts of the viewer', () => {
    expect(isViewerOpenIdea(idea('draft'), me)).toBe(true);
    expect(isViewerOpenIdea(idea('in_review'), me)).toBe(true);
    expect(isViewerOpenIdea(idea('conflicted'), me)).toBe(true);
    expect(isViewerOpenIdea(idea('merged'), me)).toBe(false);
    expect(isViewerOpenIdea(idea('draft', 'x'), me)).toBe(false);
    expect(isViewerOpenIdea(idea('draft'), null)).toBe(false);
  });

  test('only the author sees a draft', () => {
    expect(isViewerDraft(idea('draft'), me)).toBe(true);
    expect(isViewerDraft(idea('draft', 'x'), me)).toBe(false);
    expect(isVisibleIdea(idea('draft', 'x'), me)).toBe(false);
    expect(isVisibleIdea(idea('draft'), me)).toBe(true);
    expect(isVisibleIdea(idea('in_review', 'x'), me)).toBe(true);
  });
});

describe('isPollYourTurn', () => {
  test.each([
    ['open, votable and unvoted', { canVote: true, myOptionIds: [], status: 'open' }, true],
    ['already voted', { canVote: true, myOptionIds: ['a'], status: 'open' }, false],
    ['not allowed to vote', { canVote: false, myOptionIds: [], status: 'open' }, false],
    ['closed', { canVote: true, myOptionIds: [], status: 'closed' }, false]
  ] as const)('%s', (_name, poll, expected) => {
    expect(isPollYourTurn(poll)).toBe(expected);
  });
});
