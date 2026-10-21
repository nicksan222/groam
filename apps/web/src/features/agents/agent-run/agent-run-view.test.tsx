import { agentRunEventLabels } from '@groam/ai/backend/runs/events';
import { agentRunDuration, agentRunTime } from '@groam/ai/backend/runs/time';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentRunView } from './agent-run-view';

const stop = vi.hoisted(() => vi.fn());
const retry = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

const state = vi.hoisted(() => ({
  agent: null as null | {
    activeRunCount: number;
    assignedIssueCount: number;
    description: string;
    id: 'groam' | 'issue' | 'reviewer';
    label: string;
    lastActivityAt: number | null;
    status: 'failed' | 'idle' | 'working';
    surface: 'chat' | 'standalone';
  },
  events: [] as Array<{
    at: number;
    detail: string | null;
    id: string;
    input: string | null;
    kind: string;
    label: string;
    ok: boolean | null;
    output: string | null;
    toolName: string | null;
  }>,
  eventsStatus: 'Exhausted' as
    | 'CanLoadMore'
    | 'Done'
    | 'Exhausted'
    | 'LoadingFirstPage'
    | 'LoadingMore',
  run: undefined as AgentRun | undefined,
  runs: [] as AgentRun[]
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { name: 'Acme Labs' }
  })
}));

vi.mock('@/features/agents/hooks/use-agent', () => ({
  useAgentRecord: () => state.agent ?? undefined
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRun: () => state.run,
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop }),
  useAgentRunEvents: () => ({
    events: state.events,
    loadMore: vi.fn(),
    status: state.eventsStatus
  }),
  useStartQueuedAssignRuns: () => undefined
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

function issueAgent() {
  return {
    activeRunCount: 1,
    assignedIssueCount: 1,
    description: 'Works assigned issues',
    id: 'issue' as const,
    label: 'Issue agent',
    lastActivityAt: 1,
    status: 'working' as const,
    surface: 'standalone' as const
  };
}

function emptyRelated(): AgentRun['related'] {
  return { chatTitle: null, ideaTitle: null, issueTitle: null, tripName: null };
}

function run(overrides: Partial<AgentRun> & Pick<AgentRun, 'id' | 'title'>): AgentRun {
  return {
    agentId: 'issue',
    completedAt: null,
    createdBy: { name: 'Lea', userId: 'user-1' },
    discussionId: null,
    error: null,
    headline: 'Started working',
    issueId: 'issue-1' as AgentRun['issueId'],
    kickoff: 'assign',
    proposalId: null,
    shortId: 'runabc',
    related: { ...emptyRelated(), issueTitle: 'Rainy-day option', tripName: 'Lisbon' },
    report: 'Opened a draft idea.',
    startedAt: 1,
    status: 'running',
    surface: 'standalone',
    threadId: null,
    tripId: 'trip-1' as AgentRun['tripId'],
    updatedAt: 1,
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  retry.mockResolvedValue(undefined);
  state.agent = null;
  state.events = [];
  state.eventsStatus = 'Exhausted';
  state.run = undefined;
  state.runs = [];
});

describe('AgentRunView', () => {
  test('shows the run log for chat Groam instead of sending people to the thread', async () => {
    state.agent = {
      activeRunCount: 1,
      assignedIssueCount: 0,
      description: 'Chat companion',
      id: 'groam',
      label: 'Groam',
      lastActivityAt: 1,
      status: 'working',
      surface: 'chat'
    };
    state.events = [
      {
        at: 1,
        detail: null,
        id: 'event-1',
        input: null,
        kind: 'status',
        label: 'Responding',
        ok: null,
        output: null,
        toolName: null
      }
    ];
    state.run = run({
      agentId: 'groam',
      discussionId: 'discussion-1' as AgentRun['discussionId'],
      headline: 'Responding',
      id: 'run-chat' as AgentRun['id'],
      issueId: null,
      kickoff: 'assign',
      related: { ...emptyRelated(), chatTitle: 'Packing help' },
      report: 'Bring one universal adapter.',
      surface: 'chat',
      threadId: 'thread-1',
      title: 'Packing help',
      tripId: null
    });
    state.runs = [state.run];
    await render(<AgentRunView agentId="groam" runId="run-chat" />);
    expect(page.getByTestId(testIds.agentRunTitle).element().textContent).toContain('Packing help');
    await expect.element(page.getByText('Open chat')).toBeInTheDocument();
    expect(page.getByTestId(testIds.agentRunContext).element().textContent).toContain('Lea');
    await expect
      .element(page.getByRole('link', { name: 'Packing help' }))
      .toHaveAttribute('href', '/chat/discussion-1');
    await expect.element(page.getByText('Timeline')).toBeInTheDocument();
    await expect.element(page.getByText('Worker')).not.toBeInTheDocument();
    await expect.element(page.getByText(/transcript in the discussion/u)).not.toBeInTheDocument();
    await expect.element(page.getByText('Report')).toBeInTheDocument();
    await expect.element(page.getByText('Bring one universal adapter.')).toBeInTheDocument();
    expect(page.getByTestId('agent-event').element().textContent).toContain('Responding');
    expect(page.getByText('Running').elements().length).toBe(1);
    await expect.element(page.getByText('Assigned issues')).not.toBeInTheDocument();
  });

  test('keeps All agents above the run title and links the agent as a crumb', async () => {
    state.agent = issueAgent();
    state.run = run({ id: 'run-issue' as AgentRun['id'], title: 'Rainy-day option' });
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-issue" />);

    const back = page.getByRole('link', { name: 'All agents' });
    const title = page.getByTestId(testIds.agentRunTitle);
    await expect.element(back).toHaveAttribute('href', '/agents');
    await expect
      .element(page.getByRole('link', { name: 'Issue agent' }))
      .toHaveAttribute('href', '/agents/issue');
    expect(
      back.element().compareDocumentPosition(title.element()) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(title.element().textContent).toContain('Rainy-day option');
    await expect.element(page.getByText('Worker')).not.toBeInTheDocument();
    await expect.element(page.getByText('Needs attention')).not.toBeInTheDocument();
  });

  test('shows this run’s log without issue or trip metadata clutter', async () => {
    state.agent = issueAgent();
    state.run = run({ id: 'run-issue' as AgentRun['id'], title: 'Rainy-day option' });
    state.runs = [state.run];
    state.events = [
      {
        at: 1,
        detail: 'Rainy-day option',
        id: 'event-1',
        input: null,
        kind: 'status',
        label: agentRunEventLabels.issueStarted,
        ok: null,
        output: null,
        toolName: null
      }
    ];
    await render(<AgentRunView agentId="issue" runId="run-issue" />);
    await expect.element(page.getByText('Worker')).not.toBeInTheDocument();
    expect(page.getByText('Rainy-day option').elements().length).toBeGreaterThan(0);
    await expect.element(page.getByText('Report')).toBeInTheDocument();
    await expect.element(page.getByText('Opened a draft idea.')).toBeInTheDocument();
    const started = page.getByTestId(testIds.agentEvent);
    expect(started.element().textContent).toContain('Started working on');
    expect(started.element().textContent).toContain('Rainy-day option');
    await expect.element(page.getByText('Started working on this issue')).not.toBeInTheDocument();
    await expect
      .element(started.getByRole('link', { name: 'Rainy-day option' }))
      .toHaveAttribute('href', '/issues/issue-1');
    await expect.element(page.getByText('Called by')).toBeInTheDocument();
    const context = page.getByTestId(testIds.agentRunContext).element();
    expect(context.textContent).not.toContain('Issue');
    expect(context.textContent).not.toContain('Trip');
    expect(context.textContent).not.toMatch(/\bIdea\b/u);
    await expect.element(page.getByRole('link', { name: 'Lisbon' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Timeline')).toBeInTheDocument();
  });

  test('links the issue title on the started event from related data when detail is missing', async () => {
    state.agent = issueAgent();
    state.run = run({ id: 'run-issue' as AgentRun['id'], title: 'Rainy-day option' });
    state.runs = [state.run];
    state.events = [
      {
        at: 1,
        detail: null,
        id: 'event-1',
        input: null,
        kind: 'status',
        label: agentRunEventLabels.issueStarted,
        ok: null,
        output: null,
        toolName: null
      }
    ];
    await render(<AgentRunView agentId="issue" runId="run-issue" />);
    const started = page.getByTestId(testIds.agentEvent);
    expect(started.element().textContent).toContain('Started working on');
    await expect
      .element(started.getByRole('link', { name: 'Rainy-day option' }))
      .toHaveAttribute('href', '/issues/issue-1');
  });

  test('shows only this run’s title, not other activities', async () => {
    state.agent = { ...issueAgent(), activeRunCount: 0, status: 'idle' };
    const rain = run({
      completedAt: 2,
      headline: 'Finished',
      id: 'run-rain' as AgentRun['id'],
      issueId: 'issue-rain' as AgentRun['issueId'],
      related: { ...emptyRelated(), issueTitle: 'Rainy-day option', tripName: 'Lisbon' },
      report: null,
      status: 'complete',
      title: 'Rainy-day option',
      updatedAt: 2
    });
    const coast = run({
      completedAt: 1,
      headline: 'Finished',
      id: 'run-coast' as AgentRun['id'],
      issueId: 'issue-coast' as AgentRun['issueId'],
      related: { ...emptyRelated(), issueTitle: 'Coast day', tripName: 'Lisbon' },
      report: null,
      status: 'complete',
      title: 'Coast day',
      updatedAt: 1
    });
    state.run = rain;
    state.runs = [rain, coast];
    await render(<AgentRunView agentId="issue" runId="run-rain" />);
    expect(page.getByTestId(testIds.agentRunTitle).element().textContent).toContain(
      'Rainy-day option'
    );
    await expect.element(page.getByTestId(testIds.agentOtherRuns)).not.toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: /Coast day/u })).not.toBeInTheDocument();
    await expect.element(page.getByText('Coast day')).not.toBeInTheDocument();
  });

  test('links the related idea without inventing a generated-idea event', async () => {
    state.agent = {
      activeRunCount: 0,
      assignedIssueCount: 0,
      description: 'Reviews submitted ideas',
      id: 'reviewer',
      label: 'Idea reviewer',
      lastActivityAt: null,
      status: 'idle',
      surface: 'standalone'
    };
    state.run = run({
      agentId: 'reviewer',
      completedAt: 2,
      id: 'run-review' as AgentRun['id'],
      issueId: null,
      proposalId: 'proposal-1' as AgentRun['proposalId'],
      related: { ...emptyRelated(), ideaTitle: 'Kyoto food crawl', tripName: 'Lisbon' },
      status: 'complete',
      title: 'Kyoto food crawl',
      updatedAt: 2
    });
    state.runs = [state.run];
    state.events = [
      {
        at: 1,
        detail: 'Check whether day 3 still has a transfer.',
        id: 'event-thought',
        input: null,
        kind: 'thought',
        label: 'Thought',
        ok: null,
        output: null,
        toolName: null
      },
      {
        at: 1,
        detail: null,
        id: 'event-tool',
        input: '{"tripId":"trip-working"}',
        kind: 'tool',
        label: 'Read itinerary',
        ok: true,
        output: '{"tripName":"Kyoto"}',
        toolName: 'getItinerary'
      },
      {
        at: 1,
        detail: null,
        id: 'event-status',
        input: null,
        kind: 'status',
        label: 'Started review',
        ok: null,
        output: null,
        toolName: null
      }
    ];
    await render(<AgentRunView agentId="reviewer" runId="run-review" />);
    await expect.element(page.getByText('Idea reviewer')).toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.agentAssignedIssues)).not.toBeInTheDocument();
    await expect.element(page.getByText('Called by')).toBeInTheDocument();
    const idea = page.getByTestId(testIds.agentRunIdea).element();
    expect(idea.textContent).toContain('Kyoto food crawl');
    expect(page.getByRole('link', { name: 'Open idea' }).element().getAttribute('href')).toContain(
      '/trips/trip-1/ideas/proposal-1/'
    );
    const events = page.getByTestId(testIds.agentEvent).elements();
    expect(events).toHaveLength(3);
    expect(events.some((event) => event.textContent?.includes('Thought'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Check whether day 3'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Read itinerary'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Started review'))).toBe(true);
    await expect.element(page.getByRole('button', { name: 'Thoughts' })).not.toBeInTheDocument();
    expect(idea.textContent).not.toContain('generated');
    expect(page.getByTestId(testIds.agentRunTitle).element().textContent).toContain(
      'Kyoto food crawl'
    );
    const context = page.getByTestId(testIds.agentRunContext).element();
    expect(context.textContent).not.toMatch(/\bIdea\b/u);
    expect(context.textContent).not.toContain('Trip');
  });

  test('omits the idea callout when the run has no proposal', async () => {
    state.agent = { ...issueAgent(), activeRunCount: 0, status: 'idle' };
    state.run = run({
      completedAt: 1,
      headline: 'Finished',
      id: 'run-other' as AgentRun['id'],
      issueId: 'issue-other' as AgentRun['issueId'],
      related: { ...emptyRelated(), tripName: 'Lisbon' },
      report: null,
      status: 'complete',
      title: 'Other activity',
      updatedAt: 1
    });
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-other" />);
    await expect.element(page.getByTestId(testIds.agentRunIdea)).not.toBeInTheDocument();
    expect(page.getByTestId(testIds.agentRunTitle).element().textContent).toContain(
      'Other activity'
    );
  });

  test('shows run duration, timestamps, tool payload, and load earlier', async () => {
    const startedAt = 1_000;
    const completedAt = 9_000;
    state.agent = {
      ...issueAgent(),
      activeRunCount: 0,
      lastActivityAt: completedAt,
      status: 'idle'
    };
    state.eventsStatus = 'CanLoadMore';
    state.run = run({
      completedAt,
      headline: 'Read itinerary',
      id: 'run-done' as AgentRun['id'],
      startedAt,
      status: 'complete',
      title: 'Rainy-day option',
      updatedAt: completedAt
    });
    state.runs = [state.run];
    state.events = [
      {
        at: startedAt,
        detail: null,
        id: 'event-tool',
        input: '{"tripId":"trip-1"}',
        kind: 'tool',
        label: 'Read itinerary',
        ok: true,
        output: '{"tripName":"Lisbon"}',
        toolName: 'getItinerary'
      }
    ];
    await render(<AgentRunView agentId="issue" runId="run-done" />);
    expect(page.getByText('Done').elements().length).toBe(1);
    await expect.element(page.getByText('Called by')).toBeInTheDocument();
    await expect
      .element(page.getByTestId(testIds.agentRunContext).getByText('Lea'))
      .toBeInTheDocument();
    await expect.element(page.getByText('Timeline')).toBeInTheDocument();
    await expect
      .element(page.getByText(new RegExp(`${agentRunDuration(startedAt, completedAt)}`, 'u')))
      .toBeInTheDocument();
    expect(page.getByTestId('agent-event').element().textContent).toContain(
      agentRunTime(startedAt)
    );
    expect(page.getByTestId('agent-event').element().textContent).toContain('getItinerary');
    expect(page.getByTestId('agent-event').element().textContent).toContain('"tripId": "trip-1"');
    expect(page.getByTestId('agent-event').element().textContent).toContain('"tripName": "Lisbon"');
    await expect.element(page.getByRole('button', { name: 'Load earlier' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Retry from zero' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Re-run' })).toBeInTheDocument();
  });

  test('re-runs a finished issue agent and opens the new run', async () => {
    retry.mockResolvedValue('run-next');
    state.agent = { ...issueAgent(), activeRunCount: 0, lastActivityAt: 2, status: 'idle' };
    state.run = run({
      completedAt: 2,
      headline: 'Finished',
      id: 'run-done' as AgentRun['id'],
      status: 'complete',
      title: 'Rainy-day option',
      updatedAt: 2
    });
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-done" />);
    await page.getByTestId(testIds.agentRerun).click();
    expect(retry).toHaveBeenCalledWith({ runId: 'run-done' });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        params: { agentId: 'issue', runId: 'run-next' },
        to: '/agents/$agentId/$runId'
      });
    });
  });

  test('hides Finished while queued and disables load earlier while fetching', async () => {
    state.agent = issueAgent();
    state.eventsStatus = 'LoadingMore';
    state.run = run({
      headline: null,
      id: 'run-queued' as AgentRun['id'],
      startedAt: null,
      status: 'queued',
      title: 'Rainy-day option'
    });
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-queued" />);
    await expect.element(page.getByText('Waiting to start')).toBeInTheDocument();
    await expect.element(page.getByText('Finished')).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Load earlier' })).toBeDisabled();
  });

  test('retries from zero and opens the new run', async () => {
    retry.mockResolvedValue('run-next');
    state.agent = { ...issueAgent(), activeRunCount: 0, lastActivityAt: 2, status: 'failed' };
    state.run = run({
      completedAt: 2,
      error: 'The model timed out',
      headline: 'Run failed',
      id: 'run-failed' as AgentRun['id'],
      report: null,
      status: 'failed',
      title: 'Rainy-day option',
      updatedAt: 2
    });
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-failed" />);
    await page.getByTestId(testIds.agentRetryFromZero).click();
    expect(retry).toHaveBeenCalledWith({ runId: 'run-failed' });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        params: { agentId: 'issue', runId: 'run-next' },
        to: '/agents/$agentId/$runId'
      });
    });
  });

  test('does not lock a competing activity pane on the run destination', async () => {
    state.agent = { ...issueAgent(), activeRunCount: 0, status: 'idle' };
    state.run = run({
      completedAt: 1,
      error: 'timeout',
      headline: 'Run failed',
      id: 'run-0' as AgentRun['id'],
      report: null,
      status: 'failed',
      title: 'Activity 0'
    });
    state.runs = Array.from({ length: 12 }, (_, index) =>
      run({
        completedAt: index + 1,
        error: `Failed to open draft ${index}: ${'timeout '.repeat(8)}`,
        headline: 'Run failed',
        id: `run-${index}` as AgentRun['id'],
        report: null,
        status: 'failed',
        title: `Activity ${index}`,
        updatedAt: index + 1
      })
    );
    await render(<AgentRunView agentId="issue" runId="run-0" />);
    await expect
      .element(page.getByTestId(testIds.agentDetailWorkspace))
      .not.toHaveClass('overflow-hidden');
    await expect
      .element(page.getByTestId(testIds.agentRunDetail))
      .not.toHaveClass('overflow-hidden');
    await expect.element(page.getByTestId(testIds.agentOtherRuns)).not.toBeInTheDocument();
    await expect.element(page.getByText('Activity 1')).not.toBeInTheDocument();
  });

  test('shows the run title and full error without truncating in the destination', async () => {
    const firstError = 'The model timed out while writing the rainy-day option.';
    const presentedError = 'Groam AI lost connection while replying. Try again in a moment.';
    state.agent = { ...issueAgent(), activeRunCount: 0, lastActivityAt: 2, status: 'failed' };
    state.run = run({
      completedAt: 2,
      error: firstError,
      headline: 'Run failed',
      id: 'run-rain' as AgentRun['id'],
      issueId: 'issue-rain' as AgentRun['issueId'],
      report: null,
      status: 'failed',
      title: 'Rainy-day option',
      updatedAt: 2
    });
    state.events = [
      {
        at: 2,
        detail: firstError,
        id: 'event-error',
        input: null,
        kind: 'error',
        label: 'Run failed',
        ok: null,
        output: null,
        toolName: null
      }
    ];
    state.runs = [state.run];
    await render(<AgentRunView agentId="issue" runId="run-rain" />);
    const detail = page.getByTestId(testIds.agentRunDetail);
    expect(page.getByTestId(testIds.agentRunTitle).element().textContent).toContain(
      'Rainy-day option'
    );
    await expect.element(detail.getByText(presentedError)).toHaveClass('whitespace-pre-wrap');
    expect(detail.getByText(presentedError).elements()).toHaveLength(1);
    await expect
      .element(page.getByTestId(testIds.agentEvent).getByText('Run failed'))
      .toBeInTheDocument();
    await expect.element(page.getByText('Needs attention')).not.toBeInTheDocument();
    await expect.element(page.getByText('Worker')).not.toBeInTheDocument();
  });
});

test('explains provider authentication failures without offering an unsupported reviewer retry', async () => {
  state.agent = { ...issueAgent(), id: 'reviewer', label: 'Idea reviewer' };
  state.run = run({
    agentId: 'reviewer',
    id: 'review-failed' as AgentRun['id'],
    issueId: null,
    status: 'failed',
    error: 'The model provider said: Not authenticated',
    report: null,
    title: 'Review the draft'
  });
  await render(<AgentRunView agentId="reviewer" runId="review-failed" />);
  await expect
    .element(page.getByText(/Connect your ChatGPT account in AI settings/u))
    .toBeInTheDocument();
  expect(page.getByRole('link', { name: 'AI settings' }).element().getAttribute('href')).toBe(
    '/settings/ai'
  );
  await expect
    .element(page.getByRole('button', { name: 'Retry from zero' }))
    .not.toBeInTheDocument();
  await expect.element(page.getByText('No activity recorded')).toBeInTheDocument();
});

test('does not present a last update as an unrecorded start or finish', async () => {
  state.agent = issueAgent();
  state.run = run({
    id: 'missing-times' as AgentRun['id'],
    startedAt: null,
    completedAt: null,
    status: 'failed',
    title: 'Review the draft'
  });
  await render(<AgentRunView agentId="issue" runId="missing-times" />);
  const context = page.getByTestId(testIds.agentRunContext);
  await expect.poll(() => context.getByText('Not recorded').elements()).toHaveLength(2);
  await expect.element(context.getByText('Duration')).not.toBeInTheDocument();
});

test('copies the run identifier for support and investigation', async () => {
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  state.agent = issueAgent();
  state.run = run({
    id: 'copy-this-run' as AgentRun['id'],
    shortId: 'copyrn',
    title: 'Review the draft'
  });
  await render(<AgentRunView agentId="issue" runId="copy-this-run" />);
  await page.getByRole('button', { name: 'Copy run ID' }).click();
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('copyrn'));
});

test('prevents duplicate stop requests and shows pending feedback', async () => {
  let finishStop = () => {};
  const pending = new Promise<void>((resolve) => {
    finishStop = resolve;
  });
  stop.mockReturnValue(pending);
  state.agent = issueAgent();
  state.run = run({ id: 'stop-this-run' as AgentRun['id'], title: 'Review the draft' });
  await render(<AgentRunView agentId="issue" runId="stop-this-run" />);
  await page.getByRole('button', { name: 'Stop' }).click();
  const stopping = page.getByRole('button', { name: 'Stopping…' });
  await expect.element(stopping).toBeDisabled();
  // Forced: a disabled control must ignore clicks, which is the behavior under test.
  await stopping.click({ force: true });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledWith({ runId: 'stop-this-run' });
  finishStop();
  await expect.element(page.getByRole('button', { name: 'Stop' })).toBeEnabled();
});
