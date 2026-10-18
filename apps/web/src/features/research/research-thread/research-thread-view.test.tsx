import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchDetail } from '@/types/research';
import { ResearchThreadView } from './research-thread-view';

const state = vi.hoisted(() => ({
  actions: {
    isSummarizing: false,
    link: vi.fn(),
    summarize: vi.fn(),
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
vi.mock('@/features/research/hooks/use-research', () => ({ useResearch: () => state.hook }));
vi.mock('@/features/research/hooks/use-research-actions', () => ({
  useResearchActions: () => state.actions
}));
vi.mock('@/features/research/hooks/use-research-links', () => ({
  useResearchLinkOptions: () => ({ options: [] })
}));
vi.mock('@/features/discussions/discussion-thread/discussion-thread-body', () => ({
  DiscussionThreadBody: ({
    commands = [],
    events = [],
    readOnlyNotice
  }: {
    commands?: Array<{ name: string; run?: (argument: string) => unknown }>;
    events?: Array<{ content: ReactNode; key: string }>;
    readOnlyNotice?: string;
  }) => (
    <div data-testid="thread-body">
      {readOnlyNotice ?? 'composer'}
      {events.map((event) => (
        <div key={event.key}>{event.content}</div>
      ))}
      {commands.map((command) => (
        <button key={command.name} onClick={() => void command.run?.('')} type="button">
          /{command.name}
        </button>
      ))}
    </div>
  )
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

test('renders header and thread and registers screen context', async () => {
  await view();
  await expect.element(page.getByText('Hotels in Rome')).toBeVisible();
  await expect.element(page.getByRole('button', { name: '/summarize' })).toBeVisible();
  const last = state.context.mock.calls.at(-1)?.[0];
  expect(last).toMatchObject({
    data: { researchId: 'r1', title: 'Hotels in Rome' },
    key: 'research:r1'
  });
});

test('offers commands and summarize asks the researcher', async () => {
  await view();
  await expect.element(page.getByRole('button', { name: '/brief' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: '/unlink' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: '/summarize' }).click();
  expect(state.actions.summarize).toHaveBeenCalled();
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
  await expect.element(page.getByText('Ada linked issue')).toBeVisible();
  await page.getByRole('button', { name: 'Remove link Book flights' }).click();
  expect(state.actions.unlink).toHaveBeenCalledWith({ id: 'i1', kind: 'issue' });
});

test('replaces the composer with a notice when the trip is archived', async () => {
  state.hook = { ...state.hook, writable: false };
  await view();
  await expect.element(page.getByTestId('thread-body')).toHaveTextContent('This trip is archived');
});
