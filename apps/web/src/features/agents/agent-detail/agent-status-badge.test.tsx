import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentStatusBadge } from './agent-status-badge';

describe('AgentStatusBadge', () => {
  test.each([
    ['failed', 'Needs attention'],
    ['idle', 'Idle'],
    ['working', 'Working']
  ] as const)('labels the %s status', async (status, label) => {
    await render(<AgentStatusBadge status={status} />);
    await expect.element(page.getByText(label)).toBeVisible();
  });
});
