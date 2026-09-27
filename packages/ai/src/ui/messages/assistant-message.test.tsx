import type { UIMessage } from '@convex-dev/agent/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AssistantResponseMessage } from './assistant-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));
afterEach(cleanup);

test('renders an assistant response', () => {
  render(<AssistantResponseMessage disabled={false} message={message('A useful answer')} />);
  expect(screen.getByText('A useful answer')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Copy AI response' })).toBeDefined();
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
