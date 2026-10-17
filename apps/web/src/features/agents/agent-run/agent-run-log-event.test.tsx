import { agentRunEventLabels } from '@groam/ai/backend/runs/events';
import { agentRunTime } from '@groam/ai/backend/runs/time';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { testIds } from '@/lib/test-ids';
import { AgentRunLogEvent } from './agent-run-log-event';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

function makeEvent(overrides: Partial<AgentRunEvent> = {}): AgentRunEvent {
  return {
    at: 1_700_000_000_000,
    detail: null,
    id: 'event-1',
    input: null,
    kind: 'status',
    label: 'Looking around',
    ok: null,
    output: null,
    seq: 1,
    toolName: null,
    ...overrides
  } as unknown as AgentRunEvent;
}

function renderEvent(props: Parameters<typeof AgentRunLogEvent>[0]) {
  return render(
    <ol>
      <AgentRunLogEvent {...props} />
    </ol>
  );
}

describe('AgentRunLogEvent', () => {
  test('shows the label and time', async () => {
    await renderEvent({ event: makeEvent() });
    await expect.element(page.getByTestId(testIds.agentEvent)).toBeVisible();
    await expect.element(page.getByText('Looking around')).toBeVisible();
    await expect.element(page.getByText(agentRunTime(1_700_000_000_000))).toBeVisible();
  });

  test.each(['status', 'thought', 'report', 'tool', 'error'] as const)(
    'renders a %s event with its detail',
    async (kind) => {
      await renderEvent({ event: makeEvent({ detail: 'Some detail', kind }) });
      await expect.element(page.getByText('Some detail')).toBeVisible();
    }
  );

  test('hides the error detail when it repeats the run error', async () => {
    await renderEvent({
      error: 'Boom',
      event: makeEvent({ detail: 'Boom', kind: 'error', label: 'Run failed' })
    });
    await expect.element(page.getByText('Run failed')).toBeVisible();
    await expect.element(page.getByText('Boom')).not.toBeInTheDocument();
  });

  test('shows an error detail that differs from the run error', async () => {
    await renderEvent({
      error: 'Other',
      event: makeEvent({ detail: 'Boom', kind: 'error', label: 'Run failed' })
    });
    await expect.element(page.getByText('Boom')).toBeVisible();
  });

  test('shows the tool name, and marks failed tools', async () => {
    await renderEvent({ event: makeEvent({ kind: 'tool', ok: false, toolName: 'saveDraft' }) });
    await expect.element(page.getByText('saveDraft · failed')).toBeVisible();
  });

  test('a successful tool shows only its name', async () => {
    await renderEvent({ event: makeEvent({ kind: 'tool', ok: true, toolName: 'readItinerary' }) });
    await expect.element(page.getByText('readItinerary', { exact: true })).toBeVisible();
    await expect.element(page.getByText(/failed/u)).not.toBeInTheDocument();
  });

  test('a failed tool without a name shows just "failed"', async () => {
    await renderEvent({ event: makeEvent({ kind: 'tool', ok: false }) });
    await expect.element(page.getByText('failed', { exact: true })).toBeVisible();
  });

  test('tool events offer a payload with pretty-printed input and output', async () => {
    await renderEvent({
      event: makeEvent({
        input: '{"tripId":"trip-1"}',
        kind: 'tool',
        output: '{"found":true}',
        toolName: 'readItinerary'
      })
    });
    await page.getByText('Tool payload').click();
    await expect.element(page.getByText('Input')).toBeVisible();
    await expect.element(page.getByText('Output')).toBeVisible();
    await expect.element(page.getByText(/"tripId": "trip-1"/u)).toBeVisible();
  });

  test.each([
    ['without input or output', null, null],
    ['for non-tool events', '{"a":1}', '{"b":2}']
  ])('shows no payload %s', async (_, input, output) => {
    const kind = input ? 'status' : 'tool';
    await renderEvent({ event: makeEvent({ input, kind, output }) });
    await expect.element(page.getByText('Tool payload')).not.toBeInTheDocument();
  });

  test('links the issue when the run started working on it', async () => {
    await renderEvent({
      event: makeEvent({ detail: 'Rainy-day option', label: agentRunEventLabels.issueStarted }),
      issue: { issueId: 'issue-9' as never, issueTitle: 'Fallback title' }
    });
    await expect
      .element(page.getByRole('link', { name: 'Rainy-day option' }))
      .toHaveAttribute('href', '/issues/issue-9');
  });

  test('the issue link falls back to the issue title', async () => {
    await renderEvent({
      event: makeEvent({ label: agentRunEventLabels.issueStarted }),
      issue: { issueId: 'issue-9' as never, issueTitle: 'Fallback title' }
    });
    await expect.element(page.getByRole('link', { name: 'Fallback title' })).toBeVisible();
  });

  test('without an issue the started label is plain text', async () => {
    await renderEvent({ event: makeEvent({ label: agentRunEventLabels.issueStarted }) });
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
    await expect.element(page.getByText(agentRunEventLabels.issueStarted)).toBeVisible();
  });
});
