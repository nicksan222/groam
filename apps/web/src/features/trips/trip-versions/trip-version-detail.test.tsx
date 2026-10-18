import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripVersionDetail } from './trip-version-detail';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  version: {} as Record<string, unknown>
}));

vi.mock('@/features/research/research-links/linked-researches', () => ({
  LinkedResearches: () => null
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => state.navigate
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: () => state.version
}));

const proposalId = 'proposal-1' as Id<'tripProposals'>;

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    approvalCount: 0,
    approvals: [],
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    availableReviewers: [],
    baseUpdatedAt: Date.parse('2026-06-01T12:00:00.000Z'),
    canApprove: false,
    canClose: false,
    canManageReviewers: false,
    canMerge: false,
    canRebase: false,
    changes: [],
    conflicts: [],
    groamReview: null,
    hasApproved: false,
    id: proposalId,
    ideaName: 'coast-day',
    issue: null,
    requiredApprovals: 1,
    reviewers: [],
    sourceChanged: false,
    sourceTripId: 'trip-1' as Id<'trips'>,
    status: 'in_review',
    title: 'Add a coast day',
    workingTripId: 'working-1' as Id<'trips'>,
    ...overrides
  };
}

function setVersion(proposal: Record<string, unknown> | undefined, feedback: unknown[] = []) {
  state.version = {
    addFeedback: vi.fn(async () => true),
    approve: vi.fn(async () => true),
    close: vi.fn(async () => true),
    feedback,
    merge: vi.fn(async () => true),
    proposal,
    rebase: vi.fn(async () => null),
    requestAgentReview: vi.fn(async () => true),
    resolveFeedback: vi.fn(async () => true),
    setReviewers: vi.fn(async () => true),
    submit: vi.fn(async () => true)
  };
}

beforeEach(() => {
  state.navigate.mockReset();
  setVersion(makeProposal());
});

describe('TripVersionDetail', () => {
  test.each([
    ['the proposal is not loaded', undefined, false],
    ['isLoading is set', makeProposal(), true]
  ])('shows a loading state when %s', async (_, proposal, isLoading) => {
    setVersion(proposal);
    await render(<TripVersionDetail isLoading={isLoading} proposalId={proposalId} />);
    await expect.element(page.getByRole('status', { name: 'Loading idea…' })).toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: 'Add a coast day' }))
      .not.toBeInTheDocument();
  });

  test('renders the header, columns and decision box', async () => {
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect.element(page.getByText('Add a coast day').first()).toBeVisible();
    await expect
      .element(page.getByText('suggested 0 changes to the shared trip', { exact: false }))
      .toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Open this idea' })).toBeVisible();
    await expect.element(page.getByText('What happens next')).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Reviewers' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  });

  test('draft header says Your draft and Continue editing', async () => {
    setVersion(makeProposal({ status: 'draft' }));
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect.element(page.getByText('Your draft')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Continue editing' })).toBeVisible();
    await expect
      .element(page.getByText('is shaping 0 changes on this idea', { exact: false }))
      .toBeVisible();
    await expect.element(page.getByLabelText('Draft workspace')).toBeVisible();
  });

  test('Open this idea navigates to the idea', async () => {
    await render(<TripVersionDetail proposalId={proposalId} />);
    await page.getByRole('button', { name: 'Open this idea' }).click();
    expect(state.navigate).toHaveBeenCalledTimes(1);
  });

  test('embedded hides the header and notice', async () => {
    await render(<TripVersionDetail embedded proposalId={proposalId} />);
    await expect
      .element(page.getByRole('button', { name: 'Open this idea' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Idea with the group')).not.toBeInTheDocument();
    await expect.element(page.getByText('What happens next')).toBeVisible();
  });

  test('in-review ideas show the group notice', async () => {
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect.element(page.getByLabelText('Idea with the group')).toBeVisible();
  });

  test('closed ideas have no notice', async () => {
    setVersion(makeProposal({ status: 'closed' }));
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect.element(page.getByLabelText('Idea with the group')).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Leave a comment')).not.toBeInTheDocument();
  });

  test('canClose adds the pass-on control to the header', async () => {
    setVersion(makeProposal({ canClose: true }));
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect
      .element(page.getByRole('button', { name: /pass on|close|delete/i }).first())
      .toBeVisible();
  });

  test('linked issue navigates to the issue', async () => {
    setVersion(makeProposal({ issue: { id: 'issue-9', status: 'open', title: 'Rainy day plan' } }));
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect.element(page.getByText('Rainy day plan')).toBeVisible();
    await page.getByRole('button', { name: /Linked issue/ }).click();
    expect(state.navigate).toHaveBeenCalledWith({
      params: { issueId: 'issue-9' },
      to: '/issues/$issueId'
    });
  });

  test('unresolved change requests surface in the decision checks', async () => {
    setVersion(makeProposal(), [
      {
        author: { name: 'Ada' },
        changeKey: null,
        content: 'Fix the timing',
        createdAt: Date.now(),
        id: 'c1',
        kind: 'change_request',
        parentCommentId: null,
        resolvedAt: null
      }
    ]);
    await render(<TripVersionDetail proposalId={proposalId} />);
    await expect
      .element(page.getByText('1 unresolved conversation', { exact: false }).first())
      .toBeVisible();
    await expect.element(page.getByText('Fix the timing')).toBeVisible();
  });
});
