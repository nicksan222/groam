import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { DiscussionThreadView } from './discussion-thread-view';

const state = vi.hoisted(() => ({
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

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('@groam/ui/ai/chat/assistant-chat-message', () => ({
  AssistantChatMessage: ({ message }: { message: { text: string } }) => <div>{message.text}</div>
}));

vi.mock('@tanstack/react-router', () => ({
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
  useDiscussionMessageActions: () => ({
    editMessage: vi.fn().mockResolvedValue(null),
    react: vi.fn().mockResolvedValue(null),
    reactions: [],
    removeMessage: vi.fn().mockResolvedValue(null)
  })
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

afterEach(cleanup);

test('shows a loading state while the chat list is opening', () => {
  state.isListLoading = true;
  render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  expect(screen.getByRole('status', { name: 'Opening chat…' })).toBeTruthy();
});

test('shows an error when the chat is missing', () => {
  state.discussions = [];
  render(<DiscussionThreadView discussionId={'missing' as never} />);
  expect(screen.getByText('Chat not found')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Back to chats' })).toBeTruthy();
});

test('renders the empty thread state', () => {
  render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  expect(screen.getByText('Italy dates')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thread actions' })).toBeTruthy();
  expect(screen.getByText('No messages yet')).toBeTruthy();
});

test('renders user and assistant messages', () => {
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
  render(<DiscussionThreadView discussionId={'discussion-1' as never} />);
  expect(screen.getByText('Airport?')).toBeTruthy();
  expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
  expect(screen.getByText('I can compare flight options.')).toBeTruthy();
});

test('forwards composer send and stop to the thread hook', async () => {
  state.thread.canStop = true;
  render(<DiscussionThreadView discussionId={'discussion-1' as never} />);

  fireEvent.click(screen.getByRole('button', { name: 'Stop Groam' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

  expect(state.stop).toHaveBeenCalled();
  expect(state.send).toHaveBeenCalledWith({ text: 'Hello from composer' });
});
