import type { UIMessage } from '@convex-dev/agent/react';
import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { AgentScreenContext } from '#tsx/ai/context/agent-context';
import { useAssistant } from './use-assistant';

const mocks = vi.hoisted(() => ({
  actionIndex: 0,
  error: vi.fn(),
  loadMore: vi.fn(),
  messageArgs: [] as unknown[],
  mutationIndex: 0,
  messages: [] as UIMessage[],
  open: vi.fn(),
  resend: vi.fn(),
  send: vi.fn(),
  setScreen: vi.fn(),
  stop: vi.fn()
}));

vi.mock('convex/react', () => ({
  useAction: () => {
    const action = mocks.actionIndex++ % 3;
    return action === 0 ? mocks.open : action === 1 ? mocks.send : mocks.resend;
  },
  useMutation: () => (mocks.mutationIndex++ % 2 === 0 ? mocks.stop : mocks.setScreen)
}));

vi.mock('@convex-dev/agent/react', () => ({
  useUIMessages: (_query: unknown, args: unknown) => {
    mocks.messageArgs.push(args);
    return {
      loadMore: mocks.loadMore,
      results: mocks.messages,
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
  target: {
    kind: 'trip',
    section: 'issues',
    tripId: 'trip-1' as Id<'trips'>
  },
  title: 'Portugal · Decisions'
};

beforeEach(() => {
  mocks.actionIndex = 0;
  mocks.mutationIndex = 0;
  vi.clearAllMocks();
  mocks.messageArgs = [];
  mocks.messages = [];
  mocks.open.mockResolvedValue('thread-1');
  mocks.resend.mockResolvedValue(null);
  mocks.send.mockResolvedValue(null);
  mocks.setScreen.mockResolvedValue(null);
  mocks.stop.mockResolvedValue(true);
});

test('opens one durable thread only when page context is available', async () => {
  const withoutContext = renderHook(() => useAssistant(null));
  await act(() => withoutContext.result.current.open());
  expect(mocks.open).not.toHaveBeenCalled();
  withoutContext.unmount();

  mocks.actionIndex = 0;
  mocks.mutationIndex = 0;
  const { result } = renderHook(() => useAssistant(context));
  await act(() => result.current.open());
  expect(mocks.open).toHaveBeenCalledWith({
    screen: {
      capabilities: ['trip.status.read'],
      data: '{"approvalCount":1}',
      description: 'Explain decisions.',
      key: 'trip:trip-1:decisions',
      target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
      title: 'Portugal · Decisions'
    }
  });
  expect(result.current.threadId).toBe('thread-1');

  await act(() => result.current.open());
  expect(mocks.open).toHaveBeenCalledTimes(1);

  act(() => result.current.selectThread('thread-2'));
  expect(result.current.threadId).toBe('thread-2');
});

test('keeps a known thread subscribed while the assistant surface is closed, but does not send', async () => {
  const { result } = renderHook(() =>
    useAssistant(context, { enabled: false, threadId: 'selected-thread' })
  );

  expect(mocks.messageArgs[mocks.messageArgs.length - 1]).toEqual({ threadId: 'selected-thread' });
  await expect(result.current.send('Do not send')).resolves.toBe(false);
  expect(mocks.send).not.toHaveBeenCalled();
});

test('retains the opened thread and cached messages across a close and reopen', async () => {
  const { result, rerender } = renderHook(
    ({ enabled }: { enabled: boolean }) => useAssistant(context, { enabled }),
    { initialProps: { enabled: true } }
  );
  await act(() => result.current.open());
  mocks.messages = [message('assistant-1', 'assistant', 'Already here')];
  rerender({ enabled: false });

  expect(result.current.threadId).toBe('thread-1');
  expect(result.current.messages.map((item) => item.text)).toEqual(['Already here']);
  expect(mocks.messageArgs[mocks.messageArgs.length - 1]).toEqual({ threadId: 'thread-1' });

  rerender({ enabled: true });
  expect(result.current.threadId).toBe('thread-1');
  expect(mocks.open).toHaveBeenCalledTimes(1);
});

test('debounces screen navigation and injects only the latest context into the thread', async () => {
  vi.useFakeTimers();
  try {
    const nextContext = {
      ...context,
      data: { approvalCount: 2 },
      key: 'trip:trip-1:itinerary',
      title: 'Portugal · Itinerary'
    } satisfies AgentScreenContext;
    const { result, rerender } = renderHook(
      ({ screen }: { screen: AgentScreenContext }) => useAssistant(screen),
      { initialProps: { screen: context } }
    );
    await act(() => result.current.open());
    rerender({ screen: nextContext });
    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    expect(mocks.setScreen).toHaveBeenCalledTimes(1);
    expect(mocks.setScreen).toHaveBeenCalledWith({
      screen: {
        capabilities: ['trip.status.read'],
        data: '{"approvalCount":2}',
        description: 'Explain decisions.',
        key: 'trip:trip-1:itinerary',
        target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
        title: 'Portugal · Itinerary'
      },
      threadId: 'thread-1'
    });
  } finally {
    vi.useRealTimers();
  }
});

test('uses a selected chat thread without opening another one', async () => {
  const { result } = renderHook(() => useAssistant(context, { threadId: 'selected-thread' }));

  await act(() => result.current.open());
  expect(mocks.open).not.toHaveBeenCalled();
  await act(() => result.current.send('Continue this chat'));
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({ prompt: 'Continue this chat', threadId: 'selected-thread' })
  );
});

test('clears from a message and regenerates it through the resend route', async () => {
  const { result } = renderHook(() => useAssistant(context));
  await act(() => result.current.open());
  const original = message('user-7', 'user', '@groam Rework the itinerary', { order: 7 });

  await expect(result.current.resend(original)).resolves.toBe(true);

  expect(mocks.resend).toHaveBeenCalledWith({
    agent: 'groam',
    messageId: 'user-7',
    order: 7,
    prompt: '@groam Rework the itinerary',
    screen: {
      capabilities: ['trip.status.read'],
      data: '{"approvalCount":1}',
      description: 'Explain decisions.',
      key: 'trip:trip-1:decisions',
      target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
      title: 'Portugal · Decisions'
    },
    stepOrder: 0,
    threadId: 'thread-1'
  });
});

test('forwards registered data and a typesafe @agent selection', async () => {
  mocks.send.mockResolvedValue(null);
  const { result } = renderHook(() => useAssistant(context));
  await act(() => result.current.open());

  await expect(result.current.send('   ')).resolves.toBe(false);
  let sent = false;
  await act(async () => {
    sent = await result.current.send('@status What needs attention?');
  });

  expect(sent).toBe(true);
  expect(mocks.send).toHaveBeenCalledWith({
    agent: 'groam',
    prompt: '@status What needs attention?',
    screen: {
      capabilities: ['trip.status.read'],
      data: '{"approvalCount":1}',
      description: 'Explain decisions.',
      key: 'trip:trip-1:decisions',
      target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
      title: 'Portugal · Decisions'
    },
    threadId: 'thread-1'
  });
});

test('shows the user message before a streamed assistant response reaches the subscription', async () => {
  let finishSend: (() => void) | undefined;
  mocks.send.mockImplementation(
    async () =>
      await new Promise<null>((resolve) => {
        finishSend = () => resolve(null);
      })
  );
  const { rerender, result } = renderHook(() => useAssistant(context, { threadId: 'thread-1' }));

  let sendPromise: Promise<boolean> | undefined;
  act(() => {
    sendPromise = result.current.send('Show this immediately');
  });
  expect(result.current.messages.map(({ role, text }) => ({ role, text }))).toEqual([
    { role: 'user', text: 'Show this immediately' }
  ]);

  mocks.messages = [
    message('context-1', 'system', 'Current screen'),
    message('assistant-1', 'assistant', '', { order: 2, status: 'streaming' })
  ];
  rerender();
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
  rerender();
  expect(result.current.messages.filter(({ role }) => role === 'user')).toHaveLength(1);

  finishSend?.();
  await act(async () => await sendPromise);
});

test('stops a durable response stream by message order', async () => {
  mocks.messages = [message('assistant-7', 'assistant', '', { order: 7, status: 'streaming' })];
  const { result } = renderHook(() => useAssistant(context, { threadId: 'thread-1' }));

  expect(result.current.isResponding).toBe(true);
  await act(() => result.current.stop());

  expect(mocks.stop).toHaveBeenCalledWith({ order: 7, threadId: 'thread-1' });
});

test('returns false and reports provider failures', async () => {
  mocks.send.mockRejectedValue(new Error('Provider unavailable'));
  const { result } = renderHook(() => useAssistant(context));
  await act(() => result.current.open());

  let sent = true;
  await act(async () => {
    sent = await result.current.send('Hello');
  });

  expect(sent).toBe(false);
  expect(mocks.error).toHaveBeenCalledWith('Provider unavailable');
});
