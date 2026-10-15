import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useDiscussionMessageActions } from './use-discussion-message-actions';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

const discussionId = 'discussion-1' as Id<'discussions'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue([]);
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useDiscussionMessageActions', () => {
  test('marks the discussion read on mount', async () => {
    const markRead = vi.fn().mockResolvedValue(null);
    convex.useMutation
      .mockReturnValueOnce(markRead)
      .mockReturnValue(vi.fn().mockResolvedValue(null));

    await renderHook(() => useDiscussionMessageActions(discussionId));

    expect(markRead).toHaveBeenCalledWith({ discussionId });
  });

  test('forwards edit, react, and remove with the discussion id', async () => {
    const markRead = vi.fn().mockResolvedValue(null);
    const react = vi.fn().mockResolvedValue(null);
    const editMessage = vi.fn().mockResolvedValue(null);
    const removeMessage = vi.fn().mockResolvedValue(null);
    convex.useMutation
      .mockReturnValueOnce(markRead)
      .mockReturnValueOnce(react)
      .mockReturnValueOnce(editMessage)
      .mockReturnValueOnce(removeMessage);

    const { result } = await renderHook(() => useDiscussionMessageActions(discussionId));

    await act(async () => {
      await result.current.editMessage('m1', 'hello');
      await result.current.react('m1', '👍');
      await result.current.removeMessage('m1');
    });

    expect(editMessage).toHaveBeenCalledWith({
      discussionId,
      messageId: 'm1',
      text: 'hello'
    });
    expect(react).toHaveBeenCalledWith({ discussionId, emoji: '👍', messageId: 'm1' });
    expect(removeMessage).toHaveBeenCalledWith({ discussionId, messageId: 'm1' });
  });

  test('uses an empty reaction list until the reaction query resolves', async () => {
    convex.useQuery.mockReturnValue(undefined);

    const { result } = await renderHook(() => useDiscussionMessageActions(discussionId));

    expect(result.current.reactions).toEqual([]);
  });

  test('marks the replacement discussion read when its id changes', async () => {
    const markRead = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(markRead);
    const nextDiscussionId = 'discussion-2' as Id<'discussions'>;
    const { rerender } = await renderHook(({ id }) => useDiscussionMessageActions(id), {
      initialProps: { id: discussionId }
    });

    await rerender({ id: nextDiscussionId });

    expect(markRead).toHaveBeenNthCalledWith(1, { discussionId });
    expect(markRead).toHaveBeenNthCalledWith(2, { discussionId: nextDiscussionId });
  });
});
