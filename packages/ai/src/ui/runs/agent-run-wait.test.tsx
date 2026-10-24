import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { agentRunCopy } from '#ai/backend/runs/copy';
import { RUN_STATUS_LABEL } from '#ai/backend/runs/ids';
import { AgentRunBanner } from './agent-run-banner';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: toastError } }));

const wait = {
  deadlineAt: Date.parse('2026-10-18T18:00:00Z'),
  label: 'poll “Dinner Friday”',
  progress: '3 of 5 voted'
};

test('a waiting run shows what it waits for, progress, deadline, and a cancel button', async () => {
  const onCancelWait = vi.fn().mockResolvedValue(undefined);
  await render(
    <AgentRunBanner
      agentLabel="Groam"
      cancelWaitTestId="agent-wait-cancel"
      events={[{ id: 'event-1', label: 'Started waiting' }]}
      onCancelWait={onCancelWait}
      run={{ headline: 'Waiting for poll “Dinner Friday”', id: 'run-1', status: 'waiting' }}
      viewAgent={<a href="/agents/groam">{agentRunCopy.viewAgent}</a>}
      wait={wait}
    />
  );
  await expect.element(page.getByText(RUN_STATUS_LABEL.waiting)).toBeInTheDocument();
  await expect
    .element(page.getByText(`${agentRunCopy.waitingFor} poll “Dinner Friday”`))
    .toBeInTheDocument();
  await expect.element(page.getByText('3 of 5 voted')).toBeInTheDocument();
  const status = page.getByRole('status');
  await expect.element(status.getByText('3 of 5 voted')).toBeInTheDocument();
  await expect.element(status.getByText(/^until /)).toBeInTheDocument();
  await expect.element(page.getByText(/^until /)).toBeInTheDocument();
  await page.getByTestId('agent-wait-cancel').click();
  expect(onCancelWait).toHaveBeenCalledOnce();
});

test('a rejected cancel re-enables the button (the owner of onCancelWait reports it)', async () => {
  const onCancelWait = vi.fn().mockRejectedValue(new Error('Only the trip creator'));
  await render(
    <AgentRunBanner
      agentLabel="Groam"
      cancelWaitTestId="agent-wait-cancel"
      events={[]}
      onCancelWait={onCancelWait}
      run={{ headline: null, id: 'run-1', status: 'waiting' }}
      viewAgent={<a href="/agents/groam">{agentRunCopy.viewAgent}</a>}
      wait={{ ...wait, progress: null }}
    />
  );
  await page.getByTestId('agent-wait-cancel').click();
  await vi.waitFor(() => expect(onCancelWait).toHaveBeenCalledOnce());
  await expect.element(page.getByTestId('agent-wait-cancel')).toBeEnabled();
  expect(toastError).not.toHaveBeenCalled();
});

test('a running run never shows the wait line', async () => {
  await render(
    <AgentRunBanner
      agentLabel="Groam"
      cancelWaitTestId="agent-wait-cancel"
      events={[]}
      onCancelWait={vi.fn()}
      run={{ headline: 'Working…', id: 'run-1', status: 'running' }}
      viewAgent={<a href="/agents/groam">{agentRunCopy.viewAgent}</a>}
      wait={wait}
    />
  );
  await expect.element(page.getByText(RUN_STATUS_LABEL.running)).toBeInTheDocument();
  await expect.element(page.getByTestId('agent-wait-cancel')).not.toBeInTheDocument();
});
