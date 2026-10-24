import type { UIMessage } from '@convex-dev/agent/react';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import type { AgentScreenContext } from '#ai/ui/context/agent-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';
import type { AssistantChatSummary } from '#ai/ui/hooks/use-assistant-chats';
import { useAssistant } from './use-assistant';

// Convex hooks are mocked below: each route is a name the mocks dispatch on.
const route = (name: string) => ({ run: name as never });
const api: AssistantBackendApi = {
  routes: {
    assistant: {
      chats: { create: route('create'), list: route('list'), tags: route('tags') },
      context: { catalog: route('catalog') },
      messages: route('messages'),
      open: route('open'),
      resend: route('resend'),
      send: route('send'),
      stop: route('stop')
    }
  }
};

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  loadMore: vi.fn(),
  messageArgs: [] as unknown[],
  messages: [] as UIMessage[],
  open: vi.fn(),
  resend: vi.fn(),
  send: vi.fn(),
  stop: vi.fn()
}));

vi.mock('convex/react', () => ({
  useAction: (name: 'open' | 'resend' | 'send') => mocks[name],
  useMutation: (name: 'stop') => mocks[name]
}));

vi.mock('@convex-dev/agent/react', () => ({
  useUIMessages: (_query: unknown, args: unknown) => {
    mocks.messageArgs.push(args);
    return {
      loadMore: mocks.loadMore,
      results: args === 'skip' ? [] : mocks.messages,
      status: 'Exhausted'
    };
  }
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: mocks.error }
}));

function message(
  key: string,
  role: UIMessage['role'],
  text: string,
  overrides: Partial<UIMessage> = {}
): UIMessage {
  return {
    _creationTime: 1,
    id: key,
    key,
    order: 1,
    parts: [{ text, type: 'text' }],
    role,
    status: 'success',
    stepOrder: 0,
    text,
    ...overrides
  };
}

const context: AgentScreenContext = {
  capabilities: ['trip.status.read'],
  data: { approvalCount: 1 },
  description: 'Explain decisions.',
  key: 'trip:trip-1:decisions',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
  title: 'Portugal · Decisions'
};

const serializedScreen = {
  capabilities: ['trip.status.read'],
  data: '{"approvalCount":1}',
  description: 'Explain decisions.',
  key: 'trip:trip-1:decisions',
  target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
  title: 'Portugal · Decisions'
};

function chat(id: string, overrides: Partial<AssistantChatSummary> = {}): AssistantChatSummary {
  return { contextKey: 'trip:trip-1', id, status: 'active', tags: [], title: id, ...overrides };
}

const lastMessageArgs = () => mocks.messageArgs[mocks.messageArgs.length - 1];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.messageArgs = [];
  mocks.messages = [];
  mocks.open.mockResolvedValue('thread-new');
  mocks.resend.mockResolvedValue(null);
  mocks.send.mockResolvedValue(null);
  mocks.stop.mockResolvedValue(true);
});

test('reads the conversation’s newest active chat without writing anything', async () => {
  const chats = [
    chat('elsewhere', { contextKey: 'trips:list' }),
    chat('archived', { status: 'archived' }),
    chat('thread-1'),
    chat('older')
  ];
  const { result } = await renderHook(() => useAssistant(context, api, chats));

  expect(result.current.threadId).toBe('thread-1');
  expect(lastMessageArgs()).toEqual({ threadId: 'thread-1' });
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

test('is loading until the chats are known, and has no thread without a conversation', async () => {
  const { rerender, result } = await renderHook(
    ({ chats }: { chats: AssistantChatSummary[] | undefined }) => useAssistant(context, api, chats),
    { initialProps: { chats: undefined as AssistantChatSummary[] | undefined } }
  );
  expect(result.current).toMatchObject({ isLoading: true, threadId: null });
  expect(lastMessageArgs()).toBe('skip');

  await rerender({ chats: [chat('elsewhere', { contextKey: 'trips:list' })] });
  expect(result.current).toMatchObject({ isLoading: false, threadId: null });
  expect(lastMessageArgs()).toBe('skip');
  expect(mocks.open).not.toHaveBeenCalled();
});

test('a trip’s pages share one conversation', async () => {
  const itinerary = { ...context, key: 'trip:trip-1:itinerary' };
  const { result } = await renderHook(() => useAssistant(itinerary, api, [chat('thread-1')]));
  expect(result.current.threadId).toBe('thread-1');
});

test('the first message on a page without a conversation starts it, then sends to it', async () => {
  const { result } = await renderHook(() => useAssistant(context, api, []));

  let sent = false;
  await act(async () => {
    sent = await result.current.send('  Where do we start?  ');
  });

  expect(sent).toBe(true);
  expect(mocks.open).toHaveBeenCalledTimes(1);
  expect(mocks.open).toHaveBeenCalledWith({ screen: serializedScreen });
  expect(mocks.send).toHaveBeenCalledWith({
    agent: 'groam',
    prompt: 'Where do we start?',
    screen: serializedScreen,
    threadId: 'thread-new'
  });
  expect(result.current.threadId).toBe('thread-new');
  expect(lastMessageArgs()).toEqual({ threadId: 'thread-new' });

  await act(() => result.current.send('And then?'));
  expect(mocks.open).toHaveBeenCalledTimes(1);
  expect(mocks.send).toHaveBeenLastCalledWith(expect.objectContaining({ threadId: 'thread-new' }));
});

test('sends to the existing conversation with the page’s data and a typesafe @agent', async () => {
  const { result } = await renderHook(() => useAssistant(context, api, [chat('thread-1')]));

  await expect(result.current.send('   ')).resolves.toBe(false);
  await act(() => result.current.send('@status What needs attention?'));

  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.send).toHaveBeenCalledWith({
    agent: 'groam',
    prompt: '@status What needs attention?',
    screen: serializedScreen,
    threadId: 'thread-1'
  });
});

test('sends nothing without page context', async () => {
  const { result } = await renderHook(() => useAssistant(null, api, []));
  await expect(result.current.send('Hello')).resolves.toBe(false);
  expect(result.current.isLoading).toBe(false);
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

test('a chat picked in the menu wins over the conversation’s newest one', async () => {
  const { result } = await renderHook(() =>
    useAssistant(context, api, [chat('thread-1'), chat('thread-2')])
  );
  await act(() => result.current.selectThread('thread-2'));
  expect(result.current.threadId).toBe('thread-2');
  await act(() => result.current.send('Continue this chat'));
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({ prompt: 'Continue this chat', threadId: 'thread-2' })
  );
});

test('shows the first message at once, while its conversation is still starting', async () => {
  let finishOpen: ((threadId: string) => void) | undefined;
  mocks.open.mockImplementation(
    async () =>
      await new Promise<string>((resolve) => {
        finishOpen = resolve;
      })
  );
  const { result } = await renderHook(() => useAssistant(context, api, []));

  let sendPromise: Promise<boolean> | undefined;
  await act(() => {
    sendPromise = result.current.send('Show this immediately');
  });
  expect(result.current.messages.map(({ role, text }) => ({ role, text }))).toEqual([
    { role: 'user', text: 'Show this immediately' }
  ]);

  await act(async () => {
    finishOpen?.('thread-new');
    await sendPromise;
  });
  expect(result.current.threadId).toBe('thread-new');
  expect(result.current.messages.map(({ text }) => text)).toEqual(['Show this immediately']);
});

test('shows the user message before a streamed assistant response reaches the subscription', async () => {
  let finishSend: (() => void) | undefined;
  mocks.send.mockImplementation(
    async () =>
      await new Promise<null>((resolve) => {
        finishSend = () => resolve(null);
      })
  );
  const { rerender, result } = await renderHook(() =>
    useAssistant(context, api, [chat('thread-1')])
  );

  let sendPromise: Promise<boolean> | undefined;
  await act(() => {
    sendPromise = result.current.send('Show this immediately');
  });
  expect(result.current.messages.map(({ role, text }) => ({ role, text }))).toEqual([
    { role: 'user', text: 'Show this immediately' }
  ]);

  mocks.messages = [
    message('context-1', 'system', 'Current screen'),
    message('assistant-1', 'assistant', '', { order: 2, status: 'streaming' })
  ];
  await rerender();
  expect(result.current.messages.map(({ role, text }) => ({ role, text }))).toEqual([
    { role: 'system', text: 'Current screen' },
    { role: 'user', text: 'Show this immediately' },
    { role: 'assistant', text: '' }
  ]);

  mocks.messages = [
    message('context-1', 'system', 'Current screen'),
    message('user-1', 'user', 'Show this immediately'),
    message('assistant-1', 'assistant', '', { order: 2, status: 'streaming' })
  ];
  await rerender();
  expect(result.current.messages.filter(({ role }) => role === 'user')).toHaveLength(1);

  finishSend?.();
  await act(async () => await sendPromise);
});

test('clears from a message and regenerates it through the resend route', async () => {
  const { result } = await renderHook(() => useAssistant(context, api, [chat('thread-1')]));
  const original = message('user-7', 'user', '@groam Rework the itinerary', { order: 7 });

  await expect(result.current.resend(original)).resolves.toBe(true);

  expect(mocks.resend).toHaveBeenCalledWith({
    agent: 'groam',
    messageId: 'user-7',
    order: 7,
    prompt: '@groam Rework the itinerary',
    screen: serializedScreen,
    stepOrder: 0,
    threadId: 'thread-1'
  });
});

test('stops a durable response stream by message order', async () => {
  mocks.messages = [message('assistant-7', 'assistant', '', { order: 7, status: 'streaming' })];
  const { result } = await renderHook(() => useAssistant(context, api, [chat('thread-1')]));

  expect(result.current.isResponding).toBe(true);
  await act(() => result.current.stop());

  expect(mocks.stop).toHaveBeenCalledWith({ order: 7, threadId: 'thread-1' });
});

test('returns false, drops the optimistic message, and reports provider failures', async () => {
  mocks.send.mockRejectedValue(new Error('Provider unavailable'));
  const { result } = await renderHook(() => useAssistant(context, api, [chat('thread-1')]));

  let sent = true;
  await act(async () => {
    sent = await result.current.send('Hello');
  });

  expect(sent).toBe(false);
  expect(mocks.error).toHaveBeenCalledWith('Provider unavailable');
  expect(result.current.messages).toEqual([]);
});

test('reports a conversation that cannot start, and starts it on the next message', async () => {
  mocks.open.mockRejectedValueOnce(new Error('Too many new chats'));
  const { result } = await renderHook(() => useAssistant(context, api, []));

  await expect(act(() => result.current.send('Hello'))).resolves.toBe(false);
  expect(mocks.error).toHaveBeenCalledWith('Too many new chats');
  expect(mocks.send).not.toHaveBeenCalled();
  expect(result.current.threadId).toBeNull();

  await expect(act(() => result.current.send('Hello'))).resolves.toBe(true);
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ threadId: 'thread-new' }));
});

test('a second submit while the first is in flight is refused and keeps the first message', async () => {
  let finishSend: (() => void) | undefined;
  mocks.send.mockImplementation(
    async () =>
      await new Promise<null>((resolve) => {
        finishSend = () => resolve(null);
      })
  );
  const { result } = await renderHook(() => useAssistant(context, api, [chat('thread-1')]));

  let first: Promise<boolean> | undefined;
  await act(() => {
    first = result.current.send('First');
  });
  await expect(act(() => result.current.send('Second'))).resolves.toBe(false);
  expect(result.current.messages.map(({ text }) => text)).toEqual(['First']);

  await act(async () => {
    finishSend?.();
    await first;
  });
  expect(mocks.send).toHaveBeenCalledTimes(1);
});

test('without page context it never shows a chat that has no conversation key', async () => {
  const { result } = await renderHook(() =>
    useAssistant(null, api, [chat('loose', { contextKey: null })])
  );
  expect(result.current.threadId).toBeNull();
  expect(lastMessageArgs()).toBe('skip');
});

test('stays on the shown thread when a newer chat of the conversation appears', async () => {
  const { rerender, result } = await renderHook(
    ({ chats }: { chats: AssistantChatSummary[] }) => useAssistant(context, api, chats),
    { initialProps: { chats: [chat('thread-1')] } }
  );
  expect(result.current.threadId).toBe('thread-1');
  await rerender({ chats: [chat('elsewhere-new'), chat('thread-1')] });
  expect(result.current.threadId).toBe('thread-1');
});
