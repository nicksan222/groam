import { agentRunDuration, agentRunTime } from '@groam/ai/backend/runs/time';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunContext } from './agent-run-context';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const navigate = vi.fn();
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    Link: ({
      children,
      className,
      params,
      to
    }: {
      children?: ReactNode;
      className?: string;
      params?: Record<string, string>;
      to: string;
    }) => {
      let href = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        href = href.replace(`$${key}`, value);
      }
      return (
        <a className={className} href={href} onClick={(event) => event.preventDefault()}>
          {children}
        </a>
      );
    },
    useNavigate: () => navigate
  };
});

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast }));

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    agentId: 'issue',
    completedAt: null,
    createdBy: { name: 'Lea Ford', userId: 'user-1' },
    discussionId: null,
    error: null,
    headline: 'Started working',
    id: 'run-1',
    issueId: 'issue-1',
    kickoff: 'assign',
    proposalId: null,
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: 'Rainy-day option',
      tripName: 'Lisbon'
    },
    report: null,
    shortId: null,
    startedAt: 1_700_000_000_000,
    status: 'running',
    surface: 'standalone',
    threadId: null,
    title: 'Rainy-day option',
    tripId: 'trip-1',
    updatedAt: 1_700_000_100_000,
    ...overrides
  } as unknown as AgentRun;
}

const START = 1_700_000_000_000;
const END = 1_700_000_090_000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AgentRunContext', () => {
  test.each([
    ['isLoading', { isLoading: true }],
    ['no run', {}]
  ])('shows placeholders with %s', async (_, props) => {
    await render(<AgentRunContext {...props} />);
    await expect.element(page.getByTestId(testIds.agentRunContext)).toBeVisible();
    await expect.element(page.getByText('Called by')).not.toBeInTheDocument();
  });

  test('shows who called the run and how', async () => {
    await render(<AgentRunContext run={makeRun()} />);
    await expect.element(page.getByRole('group', { name: 'Run details' })).toBeVisible();
    await expect.element(page.getByText('Lea Ford')).toBeVisible();
    await expect.element(page.getByText('Assigned')).toBeVisible();
  });

  test('shows a queued kickoff', async () => {
    await render(
      <AgentRunContext run={makeRun({ kickoff: 'queue', status: 'queued', startedAt: null })} />
    );
    await expect.element(page.getByText('Queued', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Waiting to start')).toBeVisible();
    await expect.element(page.getByText('Finished')).not.toBeInTheDocument();
    await expect.element(page.getByText('Progress')).not.toBeInTheDocument();
  });

  test('shows the start time', async () => {
    await render(<AgentRunContext run={makeRun({ startedAt: START })} />);
    await expect.element(page.getByText(agentRunTime(START))).toBeVisible();
  });

  test('says "Not recorded" for a run that never started', async () => {
    await render(<AgentRunContext run={makeRun({ startedAt: null, status: 'complete' })} />);
    expect(page.getByText('Not recorded').elements().length).toBe(2);
  });

  test('an active run shows progress as in progress', async () => {
    await render(<AgentRunContext run={makeRun({ status: 'running' })} />);
    await expect.element(page.getByText('Progress')).toBeVisible();
    await expect.element(page.getByText('In progress')).toBeVisible();
  });

  test.each(['complete', 'failed', 'aborted'] as const)(
    'a %s run shows when it finished and for how long',
    async (status) => {
      await render(
        <AgentRunContext run={makeRun({ completedAt: END, startedAt: START, status })} />
      );
      await expect.element(page.getByText('Finished')).toBeVisible();
      expect(page.getByText(agentRunTime(END)).elements().length).toBeGreaterThan(0);
      await expect.element(page.getByText(agentRunDuration(START, END))).toBeVisible();
    }
  );

  test('links to the chat with its title or the run title', async () => {
    await render(
      <AgentRunContext
        run={makeRun({
          discussionId: 'disc-1' as AgentRun['discussionId'],
          related: { chatTitle: 'Packing help', ideaTitle: null, issueTitle: null, tripName: null }
        })}
      />
    );
    await expect
      .element(page.getByRole('link', { name: 'Packing help' }))
      .toHaveAttribute('href', '/chat/disc-1');
  });

  test('the chat link falls back to the run title', async () => {
    await render(
      <AgentRunContext run={makeRun({ discussionId: 'disc-1' as AgentRun['discussionId'] })} />
    );
    await expect.element(page.getByRole('link', { name: 'Rainy-day option' })).toBeVisible();
  });

  test('has no chat section without a discussion', async () => {
    await render(<AgentRunContext run={makeRun()} />);
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
  });

  test.each([
    ['the id', null, 'run-1'],
    ['the short id', 'R-7', 'R-7']
  ])('shows %s as the run id', async (_, shortId, shown) => {
    await render(<AgentRunContext run={makeRun({ shortId: shortId ?? undefined })} />);
    await expect.element(page.getByText(shown, { exact: true })).toBeVisible();
  });

  test('copies the run id and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    await render(<AgentRunContext run={makeRun({ shortId: 'R-7' })} />);
    await page.getByRole('button', { name: 'Copy run ID' }).click();
    await expect.poll(() => toast.success.mock.calls.length).toBe(1);
    expect(writeText).toHaveBeenCalledWith('R-7');
    expect(toast.success).toHaveBeenCalledWith('Run ID copied');
  });

  test('tells the user when copying fails', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await render(<AgentRunContext run={makeRun()} />);
    await page.getByRole('button', { name: 'Copy run ID' }).click();
    await expect.poll(() => toast.error.mock.calls.length).toBe(1);
    expect(toast.error).toHaveBeenCalledWith('Could not copy the run ID. Select it instead.');
  });
});
