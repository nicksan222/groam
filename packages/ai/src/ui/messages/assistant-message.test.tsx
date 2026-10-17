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

test('shows what Groam did before the reply it wrote', async () => {
  const parts = [
    {
      input: {},
      output: {},
      state: 'output-available',
      toolCallId: 'call-1',
      type: 'tool-getTripStatus'
    },
    { text: 'Here is the summary', type: 'text' }
  ] as unknown as UIMessage['parts'];
  await render(
    <AssistantResponseMessage
      disabled={false}
      message={{ ...message('Here is the summary'), parts }}
    />
  );
  const activity = page.getByText('Read trip status').element();
  const reply = page.getByText('Here is the summary').element();
  expect(activity.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
