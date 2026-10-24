import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { useResearchRun } from '@/features/research/hooks/use-research-run';
import type { ResearchDetail } from '@/types/research';
import { ResearchThreadView } from './research-thread-view';

const state = vi.hoisted(() => ({
  activity: { isLoading: false, run: null as ReturnType<typeof useResearchRun>['run'] },
  actions: {
    link: vi.fn(),
    unlink: vi.fn(),
    updateBrief: vi.fn()
  },
  canParticipate: true,
  context: vi.fn(),
  hook: {
    isLoading: false,
    research: undefined as unknown,
    threadId: 'thread-1' as null | string,
    writable: true
  }
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: state.context }));
vi.mock('@/lib/navigation/router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));
vi.mock('@/features/research/hooks/use-latest-research-run', () => ({
  useLatestResearchRun: () => null
}));
vi.mock('@/features/research/hooks/use-save-research-note', () => ({
  useSaveResearchNote: () => vi.fn()
}));
vi.mock('@/features/research/hooks/use-research-run', () => ({
  useResearchRun: () => ({
    error: null,
    events: [],
    isActive: false,
    isLoading: state.activity.isLoading,
    isStarting: false,
    run: state.activity.run,
    start: vi.fn(),
    stop: vi.fn()
  })
}));
vi.mock('@/features/research/hooks/use-research', () => ({ useResearch: () => state.hook }));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrip: () => ({ exists: true, trip: { canParticipate: state.canParticipate, name: 'Rome' } })
}));
vi.mock('@/features/trips/trip-detail/trip-join-paywall', () => ({
  TripJoinPaywall: ({ trip }: { trip: { name: string } }) => <div>Join {trip.name}</div>
}));
vi.mock('@/features/research/hooks/use-research-actions', () => ({
  useResearchActions: () => state.actions
}));
vi.mock('@/features/research/hooks/use-research-links', () => ({
  useResearchLinkOptions: () => ({ options: [] })
}));
vi.mock('@/features/discussions/hooks/use-discussion-thread', () => ({
  useDiscussionThread: () => ({
    messages: [],
    status: 'Exhausted',
    send: vi.fn(),
    stop: vi.fn(),
    canStop: false,
    isStopping: false,
    loadMore: vi.fn()
  })
}));

const research: ResearchDetail = {
  brief: 'Compare hotels',
  canManage: true,
  id: 'r1',
  links: [],
  shortId: 'rs1',
  title: 'Hotels in Rome',
  tripId: 't1'
};

beforeEach(() => {
  vi.clearAllMocks();
  state.canParticipate = true;
  state.activity = { isLoading: false, run: null };
  state.hook = { isLoading: false, research, threadId: 'thread-1', writable: true };
});

const view = () =>
  render(
    <ResearchThreadView researchId={'r1' as Id<'discussions'>} tripId={'t1' as Id<'trips'>} />
  );

test('shows the trip paywall to members without a seat', async () => {
  state.canParticipate = false;
  await view();
  await expect.element(page.getByText('Join Rome')).toBeVisible();
  await expect.element(page.getByText('Hotels in Rome')).not.toBeInTheDocument();
  expect(state.context).not.toHaveBeenCalled();
});

test('shows a loading state', async () => {
  state.hook = { ...state.hook, isLoading: true, research: undefined };
  await view();
  await expect.element(page.getByRole('status', { name: 'Opening research…' })).toBeVisible();
});

test('shows not found when the research is missing', async () => {
  state.hook = { ...state.hook, research: undefined };
  await view();
  await expect.element(page.getByText('Research not found')).toBeVisible();
});

test('shows research with supporting context and registers screen context', async () => {
  await view();
  await expect.element(page.getByText('Hotels in Rome')).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Conversation', exact: true }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Summarize findings' }))
    .not.toBeInTheDocument();
  const last = state.context.mock.calls.at(-1)?.[0];
  expect(last).toMatchObject({
    data: { researchId: 'r1', title: 'Hotels in Rome' },
    key: 'research:r1'
  });
});

test('shows linked items in the thread', async () => {
  state.hook = {
    ...state.hook,
    research: {
      ...research,
      links: [
        {
          createdAt: 5,
          createdByName: 'Ada',
          href: null,
          id: 'l1',
          label: 'Book flights',
          target: { id: 'i1', kind: 'issue' }
        }
      ]
    }
  };
  await view();
  await expect
    .element(page.getByRole('complementary').getByRole('button', { name: 'Book flights' }))
    .toBeVisible();
  await expect
    .element(
      page
        .getByRole('list', { name: 'Research history' })
        .getByRole('button', { name: 'Book flights' })
    )
    .toBeVisible();
  await page.getByRole('button', { name: 'Unlink Book flights' }).click();
  expect(state.actions.unlink).toHaveBeenCalledWith({ id: 'i1', kind: 'issue' });
});

test('replaces the composer with a notice when the trip is archived', async () => {
  state.hook = { ...state.hook, writable: false };
  await view();
  const notebook = page.getByRole('region', { name: 'Research notebook' });
  await expect
    .element(notebook.getByText('This trip is archived. Existing research is available to read.'))
    .toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Ask the researcher' }))
    .not.toBeInTheDocument();
});

test('keeps the brief, history, and composer in one notebook without view tabs', async () => {
  await view();
  const notebook = page.getByRole('region', { name: 'Research notebook' });
  await expect.element(notebook.getByRole('heading', { name: 'Research brief' })).toBeVisible();
  await expect.element(notebook.getByText('Compare hotels')).toBeVisible();
  await expect
    .element(notebook.getByRole('button', { name: 'Ask the researcher' }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect
    .element(page.getByRole('button', { name: 'Notes', exact: true }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Overview' })).not.toBeInTheDocument();
});

test('keeps an unfinished brief while writing a note', async () => {
  await view();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Research brief' }).fill('Keep this draft');
  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('textbox', { name: 'Research note' }).fill('https://example.com/unsaved');
  await expect
    .element(page.getByRole('textbox', { name: 'Research brief' }))
    .toHaveValue('Keep this draft');
});

test('keeps linked items and sources in the supporting sidebar', async () => {
  await view();
  const sidebar = page.getByRole('complementary');
  await expect.element(sidebar.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect.element(sidebar.getByRole('heading', { name: 'Linked trip items' })).toBeVisible();
});

test('waits for initial activity before editing and preserves drafts through later run updates', async () => {
  state.activity.isLoading = true;
  const screen = await view();
  await expect
    .element(page.getByRole('status', { name: 'Loading research activity…' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('textbox', { name: 'Research note' }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('textbox', { name: 'Follow-up for the researcher' }))
    .not.toBeInTheDocument();
  state.activity = { isLoading: false, run: null };
  const tree = (
    <ResearchThreadView researchId={'r1' as Id<'discussions'>} tripId={'t1' as Id<'trips'>} />
  );
  await screen.rerender(tree);
  await expect
    .element(page.getByRole('button', { name: 'Ask the researcher' }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('textbox', { name: 'Research note' }).fill('Keep this unsaved note');
  state.activity.run = {
    completedAt: 2000,
    headline: null,
    id: 'run-finished',
    report: null,
    status: 'complete',
    updatedAt: 2000
  } as unknown as NonNullable<ReturnType<typeof useResearchRun>['run']>;
  await screen.rerender(
    <ResearchThreadView researchId={'r1' as Id<'discussions'>} tripId={'t1' as Id<'trips'>} />
  );
  await expect
    .element(page.getByRole('textbox', { name: 'Research note' }))
    .toHaveValue('Keep this unsaved note');
  await expect
    .element(page.getByRole('button', { name: 'Add a note' }))
    .toHaveAttribute('aria-pressed', 'true');
});
