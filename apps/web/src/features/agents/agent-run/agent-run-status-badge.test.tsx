import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentRunStatusBadge } from './agent-run-status-badge';

describe('AgentRunStatusBadge', () => {
  test.each([
    ['aborted', 'Stopped'],
    ['complete', 'Done'],
    ['failed', 'Failed'],
    ['queued', 'Queued'],
    ['running', 'Running'],
    [null, 'Idle']
  ] as const)('labels the %s status', async (status, label) => {
    await render(<AgentRunStatusBadge status={status} />);
    await expect.element(page.getByText(label)).toBeVisible();
  });
});
