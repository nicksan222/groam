import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import { DiscussionThreadBody } from './discussion-thread-body';

const state = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(true),
  thread: {
    canStop: false,
    isStopping: false,
    loadMore: vi.fn(),
    messages: [] as DiscussionMessage[],
    send: vi.fn(),
    status: 'Exhausted',
    stop: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('@groam/ai/ui/chat/assistant-chat-message', () => ({
  AssistantChatMessage: ({ message }: { message: { text: string } }) => <div>{message.text}</div>
}));

vi.mock('@/features/discussions/hooks/use-discussion-message-actions', () => ({
  useDiscussionMessageActions: () => ({
    editMessage: vi.fn(),
    react: vi.fn(),
    reactions: [],
    removeMessage: vi.fn()
  })
}));

vi.mock('@/features/discussions/hooks/use-discussion-thread', () => ({
  useDiscussionThread: () => state.thread
}));

vi.mock('./discussion-thread-composer', () => ({
  DiscussionThreadComposer: ({
    onSend
  }: {
    onSend: (input: { text: string }) => Promise<boolean>;
  }) => (
    <button onClick={() => void onSend({ text: 'Hi' })} type="button">
      Reply
    </button>
  )
}));

beforeEach(() => {
  state.thread = { ...state.thread, messages: [], send: state.send, status: 'Exhausted' };
  state.send.mockClear();
});

test('shows the default empty state and the composer without a header', async () => {
  await render(<DiscussionThreadBody discussionId={'d-1' as never} threadId="t-1" />);
  await expect.element(page.getByText('No messages yet')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Reply' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Thread actions' }))
    .not.toBeInTheDocument();
});

test('renders a custom empty state', async () => {
  await render(
    <DiscussionThreadBody
      discussionId={'d-1' as never}
      empty={<p>Dump links here</p>}
      threadId={null}
    />
  );
  await expect.element(page.getByText('Dump links here')).toBeVisible();
});

test('renders messages and forwards sends', async () => {
  state.thread.messages = [
    {
      _creationTime: 1,
      author: { name: 'Ada', userId: 'u' },
      id: 'm1',
      key: 'k1',
      mine: false,
      order: 0,
      parts: [],
      role: 'user',
      status: 'success',
      stepOrder: 0,
      text: 'Airport?'
    } as DiscussionMessage
  ];
  await render(<DiscussionThreadBody discussionId={'d-1' as never} threadId="t-1" />);
  await expect.element(page.getByText('Airport?')).toBeVisible();
  await page.getByRole('button', { name: 'Reply' }).click();
  expect(state.send).toHaveBeenCalledWith({ text: 'Hi' });
});
