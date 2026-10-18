import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useCreateLinkedResearch } from './use-create-linked-research';

const state = vi.hoisted(() => ({ create: vi.fn(), link: vi.fn() }));
vi.mock('./use-research-actions', () => ({
  useCreateResearch: () => state.create,
  useLinkResearch: () => state.link
}));

beforeEach(() => vi.clearAllMocks());

const target = { id: 'i1', kind: 'issue' as const };

test('creates then links the new research', async () => {
  state.create.mockResolvedValue('r1');
  state.link.mockResolvedValue(true);
  const { result } = await renderHook(() => useCreateLinkedResearch('t1' as Id<'trips'>, target));
  let done = false;
  await act(async () => {
    done = await result.current({ subject: 'Hotels' });
  });
  expect(done).toBe(true);
  expect(state.link).toHaveBeenCalledWith('r1', target);
});

test('does not link when creating failed', async () => {
  state.create.mockResolvedValue(null);
  const { result } = await renderHook(() => useCreateLinkedResearch('t1' as Id<'trips'>, target));
  let done = true;
  await act(async () => {
    done = await result.current({ subject: 'Hotels' });
  });
  expect(done).toBe(false);
  expect(state.link).not.toHaveBeenCalled();
});
