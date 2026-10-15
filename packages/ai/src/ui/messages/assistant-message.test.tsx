import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantResponseMessage } from './assistant-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));

test('renders an assistant response', async () => {
  await render(<AssistantResponseMessage disabled={false} message={message('A useful answer')} />);
  await expect.element(page.getByText('A useful answer')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Copy AI response' })).toBeInTheDocument();
});

function message(text: string): UIMessage {
  return {
    _creationTime: 1,
    id: 'assistant-1',
    key: 'assistant-1',
    order: 1,
    parts: [],
    role: 'assistant',
    status: 'success',
    stepOrder: 0,
    text
  };
}
