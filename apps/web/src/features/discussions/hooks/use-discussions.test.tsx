import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  useCreateDiscussion,
  useDiscussionRoster,
  useDiscussions,
  useRenameDiscussion
} from './use-discussions';

const convex = vi.hoisted(() => ({ mutation: vi.fn(), query: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', () => ({
  useMutation: () => convex.mutation,
  useQuery: (...args: unknown[]) => convex.query(...args)
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

beforeEach(() => {
  vi.clearAllMocks();
  convex.mutation.mockResolvedValue('discussion-new');
  convex.query.mockReturnValue(undefined);
});

describe('discussion hooks', () => {
  test('uses empty collections while discussion data is loading or skipped', () => {
    const { result, rerender } = renderHook(
      ({ skip }) => useDiscussions(skip ? 'skip' : undefined),
      {
        initialProps: { skip: false }
      }
    );

    expect(result.current).toEqual({ discussions: [], isLoading: true });
    rerender({ skip: true });
    expect(convex.query.mock.calls.at(-1)?.[1]).toBe('skip');

    const roster = renderHook(() => useDiscussionRoster());
    expect(roster.result.current).toEqual({ isLoading: true, members: [] });
  });

  test('creates a discussion and reports creation failures', async () => {
    const { result } = renderHook(() => useCreateDiscussion());
    const input = { clientRequestId: 'request-1', memberUserIds: ['user-1'], title: 'Plans' };

    await expect(act(() => result.current.createDiscussion(input))).resolves.toBe('discussion-new');
    expect(convex.mutation).toHaveBeenCalledWith(input);

    convex.mutation.mockRejectedValueOnce(new Error('Offline'));
    await expect(act(() => result.current.createDiscussion(input))).resolves.toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('Offline');
  });

  test('renames a discussion and returns false when the mutation fails', async () => {
    const { result } = renderHook(() => useRenameDiscussion());

    await expect(
      act(() => result.current.renameDiscussion('discussion-1' as never, 'New title'))
    ).resolves.toBe(true);
    expect(convex.mutation).toHaveBeenCalledWith({
      discussionId: 'discussion-1',
      title: 'New title'
    });
    expect(notifications.success).toHaveBeenCalledWith('Chat renamed');

    convex.mutation.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(
      act(() => result.current.renameDiscussion('discussion-1' as never, 'Other'))
    ).resolves.toBe(false);
    expect(notifications.error).toHaveBeenCalledWith('Forbidden');
  });
});
