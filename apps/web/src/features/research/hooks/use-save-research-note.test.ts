import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useSaveResearchNote } from './use-save-research-note';

const mocks = vi.hoisted(() => ({ send: vi.fn(), error: vi.fn() }));
vi.mock('convex/react', async (original) => ({
  ...(await original<typeof import('convex/react')>()),
  useMutation: () => mocks.send
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: mocks.error } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({ messageId: 'note-1' });
});

test('saves a human note without requesting an assistant response', async () => {
  const { result } = await renderHook(() => useSaveResearchNote('research-1' as Id<'discussions'>));
  await act(async () => {
    expect(await result.current({ text: 'Keep this finding' })).toBe(true);
  });
  expect(mocks.send).toHaveBeenCalledWith({
    clientRequestId: expect.any(String),
    discussionId: 'research-1',
    text: 'Keep this finding'
  });
});

test('returns false and explains when a note could not be saved', async () => {
  mocks.send.mockRejectedValue(new Error('Trip is archived'));
  const { result } = await renderHook(() => useSaveResearchNote('research-1' as Id<'discussions'>));
  await act(async () => {
    expect(await result.current({ text: 'A note' })).toBe(false);
  });
  expect(mocks.error).toHaveBeenCalledWith('Trip is archived');
});
