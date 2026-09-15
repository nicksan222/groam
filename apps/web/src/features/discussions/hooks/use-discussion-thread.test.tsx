import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { DiscussionMessage } from './use-discussion-thread';
import { useDiscussionThread } from './use-discussion-thread';

const deps = vi.hoisted(() => ({
  attachments: undefined as
    | Record<string, { contentType: string; name: string; url: string }[]>
    | undefined,
  context: { title: 'Chat' } as { title: string } | null,
  messages: [] as DiscussionMessage[],
  mutate: vi.fn(async (args: Record<string, unknown>) => {
    if ('order' in args) return { ok: true };
    return { assistantAgent: true, messageId: 'msg-sent' };
  }),
  respond: vi.fn().mockResolvedValue(undefined),
  status: 'Exhausted',
  upload: vi.fn()
}));

vi.mock('@convex-dev/agent/react', () => ({
  useUIMessages: () => ({
    loadMore: vi.fn(),
    results: deps.messages,
    status: deps.status
  })
}));

vi.mock('convex/react', () => ({
  useAction: () => deps.respond,
  useMutation: () => deps.mutate,
  useQuery: () => deps.attachments
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useCurrentAgentContext: () => deps.context
}));

vi.mock('@groam/ui/ai/context/agent-screen-context', () => ({
  serializeAgentScreenContext: (context: unknown) => context
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => deps.upload
}));

const { toast } = await import('@groam/ui/components/toast');

function userMessage(partial: Partial<DiscussionMessage> = {}): DiscussionMessage {
  return {
    _creationTime: 1,
    id: 'msg-1',
    key: 'k-1',
    order: 0,
    parts: [{ text: 'Hello', type: 'text' }],
    role: 'user',
    status: 'success',
    stepOrder: 0,
    text: 'Hello',
    ...partial
  } as DiscussionMessage;
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.attachments = undefined;
  deps.context = { title: 'Chat' };
  deps.messages = [];
  deps.status = 'Exhausted';
  deps.mutate.mockImplementation(async (args: Record<string, unknown>) => {
    if ('order' in args) return { ok: true };
    return { assistantAgent: true, messageId: 'msg-sent' };
  });
  deps.respond.mockResolvedValue(undefined);
  deps.upload.mockResolvedValue('media-1');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

test('refuses to send when the thread is missing or the payload is empty', async () => {
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, null));

  await expect(result.current.send({ text: 'Hello' })).resolves.toBe(false);
  expect(deps.mutate).not.toHaveBeenCalled();
});

test('refuses empty text without files', async () => {
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  await expect(result.current.send({ text: '   ' })).resolves.toBe(false);
  expect(deps.mutate).not.toHaveBeenCalled();
});

test('toasts when more than five files are attached', async () => {
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));
  const files = Array.from(
    { length: 6 },
    (_, index) => new File(['x'], `${index}.png`, { type: 'image/png' })
  );

  await expect(result.current.send({ files, text: '' })).resolves.toBe(false);
  expect(toast.error).toHaveBeenCalledWith('You can attach up to 5 files');
  expect(deps.mutate).not.toHaveBeenCalled();
});

test('uploads media then sends and asks Groam to reply', async () => {
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));
  const file = new File(['img'], 'sunset.png', { type: 'image/png' });

  await act(async () => {
    await expect(result.current.send({ files: [file], text: 'Look' })).resolves.toBe(true);
  });

  expect(deps.upload).toHaveBeenCalledWith(file, null);
  expect(deps.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      discussionId: 'discussion-1',
      mediaIds: ['media-1'],
      text: 'Look'
    })
  );
  expect(deps.respond).toHaveBeenCalledWith({
    discussionId: 'discussion-1',
    promptMessageId: 'msg-sent',
    screen: deps.context
  });
});

test('aborts send when a media upload fails', async () => {
  deps.upload.mockResolvedValue(null);
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  await expect(
    result.current.send({
      files: [new File(['img'], 'sunset.png', { type: 'image/png' })],
      text: 'Look'
    })
  ).resolves.toBe(false);
  expect(deps.mutate).not.toHaveBeenCalled();
});

test('toasts and returns false when send throws', async () => {
  deps.mutate.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  await expect(result.current.send({ text: 'Hello' })).resolves.toBe(false);
  expect(toast.error).toHaveBeenCalledWith('offline');
});

test('shows a pending user message until the server copy arrives', async () => {
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  await act(async () => {
    await result.current.send({ text: 'On my way' });
  });

  expect(result.current.messages[result.current.messages.length - 1]).toMatchObject({
    mine: true,
    status: 'pending',
    text: 'On my way'
  });
});

test('merges attachment query results onto listed messages', () => {
  deps.messages = [userMessage({ id: 'msg-1', text: 'Sent a photo' })];
  deps.attachments = {
    'msg-1': [{ contentType: 'image/png', name: 'a.png', url: 'https://cdn/a.png' }]
  };

  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  expect(result.current.messages[0]?.attachments).toEqual([
    { contentType: 'image/png', name: 'a.png', url: 'https://cdn/a.png' }
  ]);
});

test('stops a streaming assistant reply', async () => {
  deps.messages = [
    userMessage({
      id: 'assistant-1',
      key: 'a-1',
      order: 4,
      role: 'assistant',
      status: 'streaming',
      text: 'Let me'
    })
  ];
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  expect(result.current.canStop).toBe(true);
  await act(async () => {
    await expect(result.current.stop()).resolves.toBe(true);
  });
  expect(deps.mutate).toHaveBeenCalledWith({
    discussionId: 'discussion-1',
    order: 4,
    threadId: 'thread-1'
  });
});

test('toasts when stopping Groam fails', async () => {
  deps.messages = [
    userMessage({
      order: 4,
      role: 'assistant',
      status: 'streaming',
      text: 'Let me'
    })
  ];
  deps.mutate.mockRejectedValue(new Error('busy'));
  const { result } = renderHook(() => useDiscussionThread('discussion-1' as never, 'thread-1'));

  await expect(result.current.stop()).resolves.toBe(false);
  expect(toast.error).toHaveBeenCalledWith('busy');
});
