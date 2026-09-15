import { agentRunEventLabels } from '@groam/ai-contracts/agents/runs/events';
import { agentRunDuration, agentRunTime } from '@groam/ai-contracts/agents/runs/time';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

vi.mock('@groam/ui/ai/context/agent-context', () => ({
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

vi.mock('@tanstack/react-router', async () => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return createAgentTestRouterMock(navigate, { preventDefault: true });
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

afterEach(cleanup);

describe('AgentRunView', () => {
  test('shows the run log for chat Groam instead of sending people to the thread', () => {
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
    render(<AgentRunView agentId="groam" runId="run-chat" />);
    expect(screen.getByTestId(testIds.agentRunTitle).textContent).toContain('Packing help');
    expect(screen.getByText('Open chat')).toBeTruthy();
    expect(screen.getByTestId(testIds.agentRunContext).textContent).toContain('Lea');
    expect(screen.getByRole('link', { name: 'Packing help' }).getAttribute('href')).toBe(
      '/chat/discussion-1'
    );
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.queryByText('Worker')).toBeNull();
    expect(screen.queryByText(/transcript in the discussion/u)).toBeNull();
    expect(screen.getByText('Report')).toBeTruthy();
    expect(screen.getByText('Bring one universal adapter.')).toBeTruthy();
    expect(screen.getByTestId('agent-event').textContent).toContain('Responding');
    expect(screen.getAllByText('Running').length).toBe(1);
    expect(screen.queryByText('Assigned issues')).toBeNull();
  });

  test('keeps All agents above the run title and links the agent as a crumb', () => {
    state.agent = issueAgent();
    state.run = run({ id: 'run-issue' as AgentRun['id'], title: 'Rainy-day option' });
    state.runs = [state.run];
    render(<AgentRunView agentId="issue" runId="run-issue" />);

    const back = screen.getByRole('link', { name: 'All agents' });
    const crumb = screen.getByRole('link', { name: 'Issue agent' });
    const title = screen.getByTestId(testIds.agentRunTitle);
    expect(back.getAttribute('href')).toBe('/agents');
    expect(crumb.getAttribute('href')).toBe('/agents/issue');
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.textContent).toContain('Rainy-day option');
    expect(screen.queryByText('Worker')).toBeNull();
    expect(screen.queryByText('Needs attention')).toBeNull();
  });

  test('shows this run’s log without issue or trip metadata clutter', () => {
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
    render(<AgentRunView agentId="issue" runId="run-issue" />);
    expect(screen.queryByText('Worker')).toBeNull();
    expect(screen.getAllByText('Rainy-day option').length).toBeGreaterThan(0);
    expect(screen.getByText('Report')).toBeTruthy();
    expect(screen.getByText('Opened a draft idea.')).toBeTruthy();
    const started = screen.getByTestId(testIds.agentEvent);
    expect(started.textContent).toContain('Started working on');
    expect(started.textContent).toContain('Rainy-day option');
    expect(screen.queryByText('Started working on this issue')).toBeNull();
    expect(
      within(started).getByRole('link', { name: 'Rainy-day option' }).getAttribute('href')
    ).toBe('/issues/issue-1');
    expect(screen.getByText('Called by')).toBeTruthy();
    const context = screen.getByTestId(testIds.agentRunContext);
    expect(context.textContent).not.toContain('Issue');
    expect(context.textContent).not.toContain('Trip');
    expect(context.textContent).not.toMatch(/\bIdea\b/u);
    expect(screen.queryByRole('link', { name: 'Lisbon' })).toBeNull();
    expect(screen.getByText('Timeline')).toBeTruthy();
  });

  test('links the issue title on the started event from related data when detail is missing', () => {
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
    render(<AgentRunView agentId="issue" runId="run-issue" />);
    const started = screen.getByTestId(testIds.agentEvent);
    expect(started.textContent).toContain('Started working on');
    expect(
      within(started).getByRole('link', { name: 'Rainy-day option' }).getAttribute('href')
    ).toBe('/issues/issue-1');
  });

  test('shows only this run’s title, not other activities', () => {
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
    render(<AgentRunView agentId="issue" runId="run-rain" />);
    expect(screen.getByTestId(testIds.agentRunTitle).textContent).toContain('Rainy-day option');
    expect(screen.queryByTestId(testIds.agentOtherRuns)).toBeNull();
    expect(screen.queryByRole('link', { name: /Coast day/u })).toBeNull();
    expect(screen.queryByText('Coast day')).toBeNull();
  });

  test('links the related idea without inventing a generated-idea event', () => {
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
    render(<AgentRunView agentId="reviewer" runId="run-review" />);
    expect(screen.getByText('Idea reviewer')).toBeTruthy();
    expect(screen.queryByTestId(testIds.agentAssignedIssues)).toBeNull();
    expect(screen.getByText('Called by')).toBeTruthy();
    const idea = screen.getByTestId(testIds.agentRunIdea);
    expect(idea.textContent).toContain('Kyoto food crawl');
    expect(screen.getByRole('link', { name: 'Open idea' }).getAttribute('href')).toContain(
      '/trips/trip-1/ideas/proposal-1/'
    );
    const events = screen.getAllByTestId(testIds.agentEvent);
    expect(events).toHaveLength(3);
    expect(events.some((event) => event.textContent?.includes('Thought'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Check whether day 3'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Read itinerary'))).toBe(true);
    expect(events.some((event) => event.textContent?.includes('Started review'))).toBe(true);
    expect(screen.getByRole('button', { name: 'Thoughts' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thoughts' }));
    const thoughts = screen.getAllByTestId(testIds.agentEvent);
    expect(thoughts).toHaveLength(1);
    expect(thoughts[0]?.textContent).toContain('Check whether day 3');
    expect(idea.textContent).not.toContain('generated');
    expect(screen.getByTestId(testIds.agentRunTitle).textContent).toContain('Kyoto food crawl');
    const context = screen.getByTestId(testIds.agentRunContext);
    expect(context.textContent).not.toMatch(/\bIdea\b/u);
    expect(context.textContent).not.toContain('Trip');
  });

  test('omits the idea callout when the run has no proposal', () => {
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
    render(<AgentRunView agentId="issue" runId="run-other" />);
    expect(screen.queryByTestId(testIds.agentRunIdea)).toBeNull();
    expect(screen.getByTestId(testIds.agentRunTitle).textContent).toContain('Other activity');
  });

  test('shows run duration, timestamps, tool payload, and load earlier', () => {
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
    render(<AgentRunView agentId="issue" runId="run-done" />);
    expect(screen.getAllByText('Done').length).toBe(1);
    expect(screen.getByText('Called by')).toBeTruthy();
    expect(screen.getByText('Lea')).toBeTruthy();
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`${agentRunDuration(startedAt, completedAt)}`, 'u'))
    ).toBeTruthy();
    expect(screen.getByTestId('agent-event').textContent).toContain(agentRunTime(startedAt));
    expect(screen.getByTestId('agent-event').textContent).toContain('getItinerary');
    expect(screen.getByTestId('agent-event').textContent).toContain('"tripId": "trip-1"');
    expect(screen.getByTestId('agent-event').textContent).toContain('"tripName": "Lisbon"');
    expect(screen.getByRole('button', { name: 'Load earlier' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry from zero' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Re-run' })).toBeTruthy();
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
    render(<AgentRunView agentId="issue" runId="run-done" />);
    fireEvent.click(screen.getByTestId(testIds.agentRerun));
    expect(retry).toHaveBeenCalledWith({ runId: 'run-done' });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        params: { agentId: 'issue', runId: 'run-next' },
        to: '/agents/$agentId/$runId'
      });
    });
  });

  test('hides Finished while queued and disables load earlier while fetching', () => {
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
    render(<AgentRunView agentId="issue" runId="run-queued" />);
    expect(screen.getByText('Waiting to start')).toBeTruthy();
    expect(screen.queryByText('Finished')).toBeNull();
    expect(screen.getByRole('button', { name: 'Load earlier' }).hasAttribute('disabled')).toBe(
      true
    );
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
    render(<AgentRunView agentId="issue" runId="run-failed" />);
    fireEvent.click(screen.getByTestId(testIds.agentRetryFromZero));
    expect(retry).toHaveBeenCalledWith({ runId: 'run-failed' });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        params: { agentId: 'issue', runId: 'run-next' },
        to: '/agents/$agentId/$runId'
      });
    });
  });

  test('does not lock a competing activity pane on the run destination', () => {
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
    render(<AgentRunView agentId="issue" runId="run-0" />);
    expect(screen.getByTestId(testIds.agentDetailWorkspace).className).not.toMatch(
      /overflow-hidden/u
    );
    expect(screen.getByTestId(testIds.agentRunDetail).className).not.toMatch(/overflow-hidden/u);
    expect(screen.queryByTestId(testIds.agentOtherRuns)).toBeNull();
    expect(screen.queryByText('Activity 1')).toBeNull();
  });

  test('shows the run title and full error without truncating in the destination', () => {
    const firstError = 'The model timed out while writing the rainy-day option.';
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
    render(<AgentRunView agentId="issue" runId="run-rain" />);
    const detail = screen.getByTestId(testIds.agentRunDetail);
    expect(screen.getByTestId(testIds.agentRunTitle).textContent).toContain('Rainy-day option');
    expect(within(detail).getByText(firstError).className).toMatch(/whitespace-pre-wrap/u);
    expect(within(detail).getAllByText(firstError)).toHaveLength(1);
    expect(within(screen.getByTestId(testIds.agentEvent)).getByText('Run failed')).toBeTruthy();
    expect(screen.queryByText('Needs attention')).toBeNull();
    expect(screen.queryByText('Worker')).toBeNull();
  });
});

test('explains provider authentication failures without offering an unsupported reviewer retry', () => {
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
  render(<AgentRunView agentId="reviewer" runId="review-failed" />);
  expect(screen.getByText(/Ask your workspace administrator/u)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Retry from zero' })).toBeNull();
  expect(screen.getByText('No activity recorded')).toBeTruthy();
});

test('does not present a last update as an unrecorded start or finish', () => {
  state.agent = issueAgent();
  state.run = run({
    id: 'missing-times' as AgentRun['id'],
    startedAt: null,
    completedAt: null,
    status: 'failed',
    title: 'Review the draft'
  });
  render(<AgentRunView agentId="issue" runId="missing-times" />);
  const context = screen.getByTestId(testIds.agentRunContext);
  expect(within(context).getAllByText('Not recorded')).toHaveLength(2);
  expect(within(context).queryByText('Duration')).toBeNull();
});

test('copies the run identifier for support and investigation', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  state.agent = issueAgent();
  state.run = run({ id: 'copy-this-run' as AgentRun['id'], title: 'Review the draft' });
  render(<AgentRunView agentId="issue" runId="copy-this-run" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy run ID' }));
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('copy-this-run'));
});

test('prevents duplicate stop requests and shows pending feedback', async () => {
  let finishStop = () => {};
  const pending = new Promise<void>((resolve) => {
    finishStop = resolve;
  });
  stop.mockReturnValue(pending);
  state.agent = issueAgent();
  state.run = run({ id: 'stop-this-run' as AgentRun['id'], title: 'Review the draft' });
  render(<AgentRunView agentId="issue" runId="stop-this-run" />);
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  const stopping = screen.getByRole('button', { name: 'Stopping…' });
  expect(stopping.hasAttribute('disabled')).toBe(true);
  fireEvent.click(stopping);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledWith({ runId: 'stop-this-run' });
  finishStop();
  await vi.waitFor(() =>
    expect(screen.getByRole('button', { name: 'Stop' }).hasAttribute('disabled')).toBe(false)
  );
});
