import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { boardLink } from '@/features/trips/testing/trip-board-fixtures';
import type { TripBoardIssue } from '@/types/trip-board';
import { TripBoardIssueCard } from './trip-board-issue-card';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }) => (
    <a
      {...rest}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>)}`
          : '')
      }
    >
      {children}
    </a>
  )
}));
const makeIssue = (id: string, over: Partial<TripBoardIssue> = {}) =>
  ({
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    canAssign: true,
    canManage: true,
    condition: null,
    dueAt: null,
    id: id as Id<'tripIssues'>,
    idea: null,
    labels: [],
    rank: 0,
    status: 'open',
    title: id,
    updatedAt: Date.UTC(2026, 7, 17),
    ...over
  }) as unknown as TripBoardIssue;

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: vi.fn(), setStatus: vi.fn() })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { members: [{ user: { name: 'Alex Traveler' }, userId: 'user-alex' }] },
    session: { user: { id: 'user-alex', name: 'Alex Traveler' } }
  })
}));

/** The lozenge around a chip's text. */
const chipOf = (text: string) => page.getByText(text).element().parentElement!;

const jordan = { kind: 'user', name: 'Jordan Lee', userId: 'user-jordan' } as const;

describe('TripBoardIssueCard', () => {
  test('links the title to the issue', async () => {
    await render(<TripBoardIssueCard issue={makeIssue('Book flights')} quiet={false} />);
    await expect
      .element(page.getByRole('link', { name: 'Book flights' }))
      .toHaveAttribute('href', '/issues/Book flights');
  });

  test.each([
    ['can assign, unassigned', { canAssign: true }, 'Assign someone'],
    ['can assign, assigned', { assignee: jordan, canAssign: true }, 'Assigned to Jordan Lee']
  ])('offers the assignee picker when the viewer %s', async (_, over, label) => {
    await render(
      <TripBoardIssueCard issue={makeIssue('i1', over as Partial<TripBoardIssue>)} quiet={false} />
    );
    await expect.element(page.getByRole('button', { name: label })).toBeInTheDocument();
  });

  test.each([
    ['unassigned', {}],
    ['assigned', { assignee: jordan }]
  ])('offers no picker to a viewer who cannot assign an %s issue', async (_, over) => {
    await render(
      <TripBoardIssueCard
        issue={makeIssue('i1', { canAssign: false, ...over } as Partial<TripBoardIssue>)}
        quiet={false}
      />
    );
    await expect.element(page.getByTestId('trip-board-assign')).not.toBeInTheDocument();
  });

  test('tints its idea chip in the hue it shares with its idea', async () => {
    const link = boardLink('Hostel', { tone: 1 });
    await render(
      <TripBoardIssueCard issue={makeIssue('i1', { idea: link.idea })} link={link} quiet={false} />
    );
    await expect.element(page.getByTestId('issue-card')).toHaveAttribute('data-link-tone', '1');
    await expect.element(chipOf('Idea in review')).toHaveClass(/bg-chart-2/);
  });

  test('names the open idea when its newest idea is closed', async () => {
    const closed = {
      id: 'idea-new',
      status: 'closed',
      title: 'Camping',
      workingTripId: 'trip-work'
    };
    const link = boardLink('Hostel', { idea: { ...boardLink().idea, status: 'draft' } });
    await render(
      <TripBoardIssueCard
        issue={makeIssue('i1', { idea: closed } as Partial<TripBoardIssue>)}
        link={link}
        quiet={false}
      />
    );
    await expect.element(chipOf('Idea drafted')).toHaveClass(/bg-chart-1/);
    await expect.element(page.getByText('Idea closed')).not.toBeInTheDocument();
  });

  test('leaves the idea chip plain without a link', async () => {
    const idea = { id: 'idea-1', status: 'merged', title: 'Hostel', workingTripId: 'trip-work' };
    await render(
      <TripBoardIssueCard
        issue={makeIssue('i1', { idea } as Partial<TripBoardIssue>)}
        quiet={false}
      />
    );
    await expect.element(page.getByTestId('issue-card')).not.toHaveAttribute('data-link-tone');
    await expect.element(chipOf('Idea applied')).not.toHaveClass(/bg-chart/);
  });

  test.each([true, false])('quiet=%s toggles the quiet surface', async (quiet) => {
    await render(<TripBoardIssueCard issue={makeIssue('i1')} quiet={quiet} />);
    const card = page.getByTestId('issue-card');
    if (quiet) await expect.element(card).toHaveClass('bg-card/60');
    else await expect.element(card).not.toHaveClass('bg-card/60');
  });
});
