import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchDetail } from '@/types/research';
import { ResearchThreadView } from './research-thread-view';

const state = vi.hoisted(() => ({
  actions: {
    link: vi.fn(),
    unlink: vi.fn(),
    updateBrief: vi.fn()
  },
  context: vi.fn(),
  hook: {
    isLoading: false,
    research: undefined as unknown,
    threadId: 'thread-1' as null | string,
    writable: true
  }
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: state.context }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
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
    isLoading: false,
    isStarting: false,
    run: null,
    start: vi.fn(),
    stop: vi.fn()
  })
}));
vi.mock('@/features/research/hooks/use-research', () => ({ useResearch: () => state.hook }));
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
  state.hook = { isLoading: false, research, threadId: 'thread-1', writable: true };
});

const view = () => render(<ResearchThreadView researchId={'r1' as Id<'discussions'>} />);

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
  await expect.element(page.getByRole('button', { name: 'Book flights' })).toBeVisible();
  await page.getByRole('button', { name: 'Unlink Book flights' }).click();
  expect(state.actions.unlink).toHaveBeenCalledWith({ id: 'i1', kind: 'issue' });
});

test('replaces the composer with a notice when the trip is archived', async () => {
  state.hook = { ...state.hook, writable: false };
  await view();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect
    .element(
      page.getByRole('region', { name: 'Research notebook' }).getByText('This trip is archived')
    )
    .toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
});

test('keeps an unfinished brief and source URL when switching research views', async () => {
  await view();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Research brief' }).fill('Keep this draft');
  await page.getByRole('textbox', { name: 'Source URL' }).fill('https://example.com/unsaved');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research brief' }))
    .toHaveValue('Keep this draft');
  await expect
    .element(page.getByRole('textbox', { name: 'Source URL' }))
    .toHaveValue('https://example.com/unsaved');
});

test('keeps topic drafts scoped to their research when navigating between topics', async () => {
  const screen = await view();
  await page.getByRole('textbox', { name: 'Research topic' }).fill('An unfinished hotel question');
  state.hook = { ...state.hook, research: { ...research, id: 'r2', title: 'Train routes' } };
  await screen.rerender(<ResearchThreadView researchId={'r2' as Id<'discussions'>} />);
  await expect
    .element(page.getByRole('textbox', { name: 'Research topic' }))
    .toHaveValue('Train routes');
});

test('keeps brief, sources, and linked items in the supporting sidebar across views', async () => {
  await view();
  const sidebar = page.getByRole('complementary');
  await expect.element(sidebar.getByRole('heading', { name: 'Research brief' })).toBeVisible();
  await expect.element(sidebar.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect.element(sidebar.getByRole('heading', { name: 'Linked trip items' })).toBeVisible();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect.element(sidebar.getByRole('heading', { name: 'Research brief' })).toBeVisible();
  await expect.element(sidebar.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect.element(sidebar.getByRole('heading', { name: 'Linked trip items' })).toBeVisible();
});
