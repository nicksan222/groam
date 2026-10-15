import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { assistantContextMessage } from '#ai/agents';
import { SystemMessage } from './system-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));

test('renders a durable context marker', async () => {
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
  await render(<SystemMessage disabled={false} message={message} />);
  expect(page.getByRole('note').element().getAttribute('aria-label')).toContain(
    'Context: Portugal'
  );
});
