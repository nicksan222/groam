import type { UIMessage } from '@convex-dev/agent/react';
import { assistantContextMessage } from '@groam/ai-contracts/agents/registry';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SystemMessage } from './system-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));
afterEach(cleanup);

test('renders a durable context marker', () => {
  const text = assistantContextMessage({
    agent: 'groam',
    key: 'trip:1',
    tags: [],
    target: { kind: 'trip', section: 'overview', tripId: 'trip-1' },
    title: 'Portugal'
  });
  const message: UIMessage = {
    _creationTime: 1,
    id: 'system-1',
    key: 'system-1',
    order: 1,
    parts: [],
    role: 'system',
    status: 'success',
    stepOrder: 0,
    text
  };
  render(<SystemMessage disabled={false} message={message} />);
  expect(screen.getByRole('note').getAttribute('aria-label')).toContain('Context: Portugal');
});
