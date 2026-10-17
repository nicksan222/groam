import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { DiscussionThreadView } from './discussion-thread-view';

const state = vi.hoisted(() => ({
  actionsArgs: [] as unknown[][],
  discussions: [] as DiscussionListItem[],
  isListLoading: false,
  send: vi.fn().mockResolvedValue(true),
  stop: vi.fn().mockResolvedValue(true),
  thread: {
    canStop: false,
    isStopping: false,
    loadMore: vi.fn(),
    messages: [] as DiscussionMessage[],
    send: vi.fn().mockResolvedValue(true),
    status: 'Exhausted',
    stop: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('@groam/ai/ui/chat/assistant-chat-message', () => ({
  AssistantChatMessage: ({ message }: { message: { text: string } }) => <div>{message.text}</div>
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({
    discussions: state.discussions,
    isLoading: state.isListLoading
  }),
  useRenameDiscussion: () => ({ renameDiscussion: vi.fn().mockResolvedValue(true) })
}));

vi.mock('@/features/discussions/hooks/use-discussion-message-actions', () => ({
  useDiscussionMessageActions: (...args: unknown[]) => {
    state.actionsArgs.push(args);
    return {
      editMessage: vi.fn().mockResolvedValue(null),
      react: vi.fn().mockResolvedValue(null),
      reactions: [],
      removeMessage: vi.fn().mockResolvedValue(null)
    };
  }
}));

vi.mock('@/features/discussions/hooks/use-discussion-thread', () => ({
  useDiscussionThread: () => state.thread
}));

vi.mock('./discussion-thread-composer', () => ({
  DiscussionThreadComposer: ({
    canStop,
    onSend,
    onStop
  }: {
    canStop: boolean;
    onSend: (input: { text: string }) => Promise<boolean>;
    onStop: () => Promise<boolean>;
  }) => (
    <div>
      {canStop ? (
        <button onClick={() => void onStop()} type="button">
          Stop Groam
        </button>
      ) : null}
      <form
        aria-label="Message"
        onSubmit={(event) => {
          event.preventDefault();
          void onSend({ text: 'Hello from composer' });
        }}
      >
        <button type="submit">Reply</button>
      </form>
    </div>
  )
}));

const discussion: DiscussionListItem = {
  createdBy: { name: 'Ada', userId: 'user-a' },
  id: 'discussion-1',
  lastMessage: null,
  members: [{ image: null, name: 'Ada', userId: 'user-a' }],
  threadId: 'thread-1',
  title: 'Italy dates',
  tripId: null,
  tripName: null,
  unread: false,
  updatedAt: 1
} as DiscussionListItem;

function message(partial: Partial<DiscussionMessage>): DiscussionMessage {
  return {
    _creationTime: 1,
    id: 'msg-1',
    key: 'k-1',
    order: 0,
    parts: [],
    role: 'user',
    status: 'success',
    stepOrder: 0,
    text: 'Hello',
    ...partial
  } as DiscussionMessage;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.actionsArgs = [];
  state.discussions = [discussion];
  state.isListLoading = false;
  state.thread = {
    canStop: false,
    isStopping: false,
    loadMore: vi.fn(),
    messages: [],
    send: state.send,
    status: 'Exhausted',
    stop: state.stop
  };
});

test('shows a loading state while the chat list is opening', async () => {
  state.isListLoading = true;
  await render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  await expect.element(page.getByRole('status', { name: 'Opening chat…' })).toBeInTheDocument();
});

test('shows an error when the chat is missing', async () => {
  state.discussions = [];
  await render(<DiscussionThreadView discussionId={'missing' as never} />);
  await expect.element(page.getByText('Chat not found')).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Back to chats' })).toBeInTheDocument();
});

test('renders the empty thread state', async () => {
  await render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  await expect.element(page.getByText('Italy dates')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Thread actions' })).toBeInTheDocument();
  await expect.element(page.getByText('No messages yet')).toBeInTheDocument();
});

test('renders user and assistant messages', async () => {
  state.thread.messages = [
    message({
      author: { name: 'Ada', userId: 'user-a' },
      key: 'u-1',
      mine: false,
      text: 'Airport?'
    }),
    message({
      key: 'a-1',
      role: 'assistant',
      text: 'I can compare flight options.'
    })
  ];
  await render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  await expect.element(page.getByText('Airport?')).toBeInTheDocument();
  expect(page.getByText('Ada').elements().length).toBeGreaterThan(0);
  await expect.element(page.getByText('I can compare flight options.')).toBeInTheDocument();
});

test('forwards composer send and stop to the thread hook', async () => {
  state.thread.canStop = true;
  await render(<DiscussionThreadView discussionId={'discussion-1' as never} />);

  await page.getByRole('button', { name: 'Stop Groam' }).click();
  await page.getByRole('button', { name: 'Reply' }).click();

  expect(state.stop).toHaveBeenCalled();
  expect(state.send).toHaveBeenCalledWith({ text: 'Hello from composer' });
});

test('keys read tracking on the newest message so an open chat stays read', async () => {
  state.thread.messages = [message({ key: 'k-1', status: 'streaming', text: 'Hel' })];
  const view = await render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  const streamingKey = state.actionsArgs.at(-1)?.[1];
  expect(state.actionsArgs.at(-1)?.[0]).toBe('discussion-1');

  state.thread = {
    ...state.thread,
    messages: [message({ key: 'k-1', status: 'streaming', text: 'Hello there' })]
  };
  await view.rerender(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  expect(state.actionsArgs.at(-1)?.[1]).toBe(streamingKey);

  state.thread = {
    ...state.thread,
    messages: [message({ key: 'k-1', status: 'success', text: 'Hello there' })]
  };
  await view.rerender(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  expect(state.actionsArgs.at(-1)?.[1]).not.toBe(streamingKey);
});
