import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

describe('AgentRunLog', () => {
  test('filters tool calls and failures without changing event order', async () => {
    await render(<AgentRunLog events={events} />);
    expect(page.getByTestId(testIds.agentEvent).elements()).toHaveLength(3);
    await page.getByRole('button', { name: 'Tool calls' }).click();
    await expect.element(page.getByText('Started review')).not.toBeInTheDocument();
    expect(page.getByTestId(testIds.agentEvent).elements()).toHaveLength(2);
    await page.getByRole('button', { name: 'Errors' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Errors' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(page.getByTestId(testIds.agentEvent).elements()).toHaveLength(1);
    await expect.element(page.getByText('Connection unavailable')).toBeInTheDocument();
    await page.getByRole('button', { name: 'All activity' }).click();
    expect(page.getByTestId(testIds.agentEvent).elements()[0].textContent).toContain(
      'Started review'
    );
  });

  test('distinguishes loading activity from an empty completed run', async () => {
    const { rerender } = await render(<AgentRunLog events={[]} isLoading />);
    await expect
      .element(page.getByRole('status', { name: 'Loading activity' }))
      .toBeInTheDocument();
    await expect.element(page.getByText('No activity recorded')).not.toBeInTheDocument();
    await rerender(<AgentRunLog events={[]} />);
    await expect.element(page.getByText('No activity recorded')).toBeInTheDocument();
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  test('explains the live waiting state', async () => {
    await render(<AgentRunLog events={[]} isActive />);
    await expect.element(page.getByText('Waiting for activity')).toBeInTheDocument();
    await expect.element(page.getByText('Updates automatically')).toBeInTheDocument();
  });

  test('keeps pagination available when a filter has no matches', async () => {
    await render(
      <AgentRunLog events={[events[0]]} loadEarlier={<button type="button">Load earlier</button>} />
    );
    await page.getByRole('button', { name: 'Errors' }).click();
    await expect.element(page.getByText('No matching activity')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Load earlier' })).toBeInTheDocument();
  });

  test('labels tool inputs and outputs inside a collapsed disclosure', async () => {
    await render(<AgentRunLog events={[events[1]]} />);
    const disclosure = page.getByText('Tool payload').element().closest('details');
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.textContent).toContain('Input');
    expect(disclosure?.textContent).toContain('Output');
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe(
      '1970-01-01T00:00:02.000Z'
    );
  });
});
