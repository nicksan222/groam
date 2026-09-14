import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { testIds } from '@/lib/test-ids';
import { AgentRunLog } from './agent-run-log';

const events: AgentRunEvent[] = [
  {
    at: 1000,
    seq: 1,
    detail: null,
    id: 'started' as AgentRunEvent['id'],
    input: null,
    kind: 'status',
    label: 'Started review',
    ok: null,
    output: null,
    toolName: null
  },
  {
    at: 2000,
    seq: 2,
    detail: null,
    id: 'read' as AgentRunEvent['id'],
    input: '{"tripId":"trip-1"}',
    kind: 'tool',
    label: 'Read itinerary',
    ok: true,
    output: '{"found":true}',
    toolName: 'readItinerary'
  },
  {
    at: 3000,
    seq: 3,
    detail: 'Connection unavailable',
    id: 'failed' as AgentRunEvent['id'],
    input: null,
    kind: 'tool',
    label: 'Save draft',
    ok: false,
    output: null,
    toolName: 'saveDraft'
  }
];

afterEach(cleanup);

describe('AgentRunLog', () => {
  test('filters tool calls and failures without changing event order', () => {
    render(<AgentRunLog events={events} />);
    expect(screen.getAllByTestId(testIds.agentEvent)).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Tool calls' }));
    expect(screen.queryByText('Started review')).toBeNull();
    expect(screen.getAllByTestId(testIds.agentEvent)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Errors' }));
    expect(screen.getByRole('button', { name: 'Errors' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getAllByTestId(testIds.agentEvent)).toHaveLength(1);
    expect(screen.getByText('Connection unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All activity' }));
    expect(screen.getAllByTestId(testIds.agentEvent)[0].textContent).toContain('Started review');
  });

  test('distinguishes loading activity from an empty completed run', () => {
    const { rerender } = render(<AgentRunLog events={[]} isLoading />);
    expect(screen.getByRole('status', { name: 'Loading activity' })).toBeTruthy();
    expect(screen.queryByText('No activity recorded')).toBeNull();
    rerender(<AgentRunLog events={[]} />);
    expect(screen.getByText('No activity recorded')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('explains the live waiting state', () => {
    render(<AgentRunLog events={[]} isActive />);
    expect(screen.getByText('Waiting for activity')).toBeTruthy();
    expect(screen.getByText('Updates automatically')).toBeTruthy();
  });

  test('keeps pagination available when a filter has no matches', () => {
    render(
      <AgentRunLog events={[events[0]]} loadEarlier={<button type="button">Load earlier</button>} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Errors' }));
    expect(screen.getByText('No matching activity')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load earlier' })).toBeTruthy();
  });

  test('labels tool inputs and outputs inside a collapsed disclosure', () => {
    render(<AgentRunLog events={[events[1]]} />);
    const disclosure = screen.getByText('Tool payload').closest('details');
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.textContent).toContain('Input');
    expect(disclosure?.textContent).toContain('Output');
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe(
      '1970-01-01T00:00:02.000Z'
    );
  });
});
