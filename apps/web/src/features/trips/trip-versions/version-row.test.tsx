import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { VersionRow } from './version-row';

type Props = Parameters<typeof VersionRow>[0];

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    onClick,
    to
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    to: string;
  }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  )
}));

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    canApprove: false,
    canMerge: false,
    canRebase: false,
    conflictCount: 0,
    feedbackCount: 0,
    hasApproved: false,
    id: 'proposal-1' as Id<'tripProposals'>,
    ideaName: 'coast-day',
    status: 'in_review',
    title: 'Add a coast day',
    unresolvedFeedbackCount: 0,
    updatedAt: Date.parse('2026-06-01T12:00:00.000Z'),
    workingTripId: 'working-1' as Id<'trips'>,
    ...overrides
  } as unknown as Props['proposal'];
}

function setup(proposal: Props['proposal'], viewerUserId: string | null = 'user-lea') {
  const props = {
    onOpen: vi.fn(),
    onOpenCopy: vi.fn(),
    proposal,
    sourceTripId: 'trip-1' as Id<'trips'>,
    viewerUserId
  };
  return props;
}

describe('VersionRow', () => {
  test('shows title, author, status and an Open link that fires onOpen', async () => {
    const props = setup(makeProposal());
    await render(<VersionRow {...props} />);
    await expect.element(page.getByRole('heading', { name: 'Add a coast day' })).toBeVisible();
    await expect.element(page.getByText('by Alex Morgan')).toBeVisible();
    await expect.element(page.getByText('In review', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Open' }).click();
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  test('the viewer draft shows Continue editing and fires onOpenCopy', async () => {
    const props = setup(
      makeProposal({ author: { name: 'Lea', userId: 'user-lea' }, status: 'draft' })
    );
    await render(<VersionRow {...props} />);
    await expect
      .element(page.getByText('Your idea. Edit it, then send it for review.'))
      .toBeVisible();
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Continue editing' }).click();
    expect(props.onOpenCopy).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['in_review', 'Reviewing changes before they are applied to the shared trip.'],
    ['conflicted', 'The shared trip changed. Update this idea before applying it.']
  ])('purpose copy for %s', async (status, copy) => {
    await render(<VersionRow {...setup(makeProposal({ status }))} />);
    await expect.element(page.getByText(copy)).toBeVisible();
  });

  test('applied ideas have no purpose line', async () => {
    await render(<VersionRow {...setup(makeProposal({ status: 'merged' }))} />);
    await expect.element(page.getByText('Applied', { exact: true })).toBeVisible();
    await expect.element(page.getByText(/Reviewing changes/)).not.toBeInTheDocument();
  });

  test('conflicted ideas show the conflict count', async () => {
    await render(
      <VersionRow {...setup(makeProposal({ conflictCount: 2, status: 'conflicted' }))} />
    );
    await expect.element(page.getByText('2 conflicts')).toBeVisible();
  });

  test.each([
    [0, 0, false],
    [3, 1, true]
  ])('feedback %s total / %s open threads visible=%s', async (feedbackCount, open, visible) => {
    await render(
      <VersionRow {...setup(makeProposal({ feedbackCount, unresolvedFeedbackCount: open }))} />
    );
    const threads = page.getByText(`${open}/${feedbackCount} open threads`);
    if (visible) await expect.element(threads).toBeVisible();
    else await expect.element(threads).not.toBeInTheDocument();
  });

  test('exposes status data attributes', async () => {
    await render(<VersionRow {...setup(makeProposal())} />);
    const article = page.getByRole('article');
    await expect.element(article).toHaveAttribute('data-status', 'in_review');
    await expect.element(article).toHaveAttribute('data-idea-name', 'coast-day');
  });
});
