import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardIssue } from '@/types/trip-board';
import { TripBoardAssignee } from './trip-board-assignee';

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

const state = vi.hoisted(() => ({ assign: vi.fn() }));

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: state.assign, setStatus: vi.fn() })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: {
      members: [
        { user: { name: 'Alex Traveler' }, userId: 'user-alex' },
        { user: { name: 'Jordan Lee' }, userId: 'user-jordan' }
      ]
    },
    session: { user: { id: 'user-alex', name: 'Alex Traveler' } }
  })
}));

beforeEach(() => state.assign.mockReset());

describe('TripBoardAssignee', () => {
  test.each([
    ['unassigned', null, 'Assign someone'],
    [
      'assigned to a traveler',
      { kind: 'user', name: 'Jordan Lee', userId: 'user-jordan' },
      'Assigned to Jordan Lee'
    ]
  ])('labels the trigger for an issue that is %s', async (_, assignee, label) => {
    await render(
      <TripBoardAssignee issue={makeIssue('i1', { assignee } as Partial<TripBoardIssue>)} />
    );
    await expect.element(page.getByRole('button', { name: label })).toBeVisible();
  });

  test('assigns the issue to the viewer from the picker', async () => {
    await render(<TripBoardAssignee issue={makeIssue('i1')} />);
    await page.getByRole('button', { name: 'Assign someone' }).click();
    await page.getByRole('button', { name: 'Assign me' }).click();
    expect(state.assign).toHaveBeenCalledWith('i1', {
      kind: 'user',
      name: 'Alex Traveler',
      userId: 'user-alex'
    });
  });

  test('assigns another traveler', async () => {
    await render(<TripBoardAssignee issue={makeIssue('i1')} />);
    await page.getByRole('button', { name: 'Assign someone' }).click();
    await page.getByRole('button', { name: 'Assign Jordan Lee' }).click();
    expect(state.assign).toHaveBeenCalledWith('i1', {
      kind: 'user',
      name: 'Jordan Lee',
      userId: 'user-jordan'
    });
  });

  test('unassigns when the current assignee is chosen again', async () => {
    const assignee = { kind: 'user', name: 'Jordan Lee', userId: 'user-jordan' } as const;
    await render(
      <TripBoardAssignee issue={makeIssue('i1', { assignee } as Partial<TripBoardIssue>)} />
    );
    await page.getByRole('button', { name: 'Assigned to Jordan Lee' }).click();
    await page.getByRole('button', { name: 'Unassign Jordan Lee' }).click();
    expect(state.assign).toHaveBeenCalledWith('i1', null);
  });
});
