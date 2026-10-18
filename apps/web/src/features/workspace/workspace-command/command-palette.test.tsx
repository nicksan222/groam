import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { CommandPalette } from './command-palette';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ trips: [] })
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useWorkspaceIdeas: () => ({
    proposals: [
      {
        id: 'idea-1',
        sourceTripId: 'trip-coast',
        sourceTripName: 'Summer trip',
        title: 'Coast day'
      }
    ]
  })
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useWorkspaceIssues: () => ({ issues: [] })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: [] })
}));

vi.mock('@/features/agents/hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: [] })
}));

beforeEach(() => {
  navigate.mockReset();
});

test('command palette jumps to the nested idea clone', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await page.getByRole('option', { name: /Coast day/u }).click();
  expect(navigate).toHaveBeenCalledWith({
    params: { proposalId: 'idea-1', tripId: 'trip-coast', view: 'overview' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});

test('command palette moves through results with the keyboard and opens with Enter', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const search = page.getByRole('combobox', { name: 'Search' });
  await expect
    .element(page.getByRole('option', { name: /Coast day/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(page.getByRole('option', { name: /All agents/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({ to: '/trips/$tripId/ideas/$proposalId/$view' })
  );
  await expect.element(search).not.toBeInTheDocument();
});

test('command palette explains when nothing matches', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'zzz');
  await expect.element(page.getByText('No matches for “zzz”')).toBeInTheDocument();
  await expect.element(page.getByText('0 results')).toBeInTheDocument();
});
