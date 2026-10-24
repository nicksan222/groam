import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useCreateIdea } from './use-workspace-ideas';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: (...args: unknown[]) => convex.useMutation(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

vi.mock('@groam/ui/components/toast', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(undefined);
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue('proposal-1'));
  convex.useQuery.mockReturnValue(undefined);
});

test('creates an untitled idea and reports creation failures', async () => {
  const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
  convex.useMutation.mockReturnValue(create);
  const { result } = await renderHook(() => useCreateIdea());

  let proposal: unknown;
  await act(async () => {
    proposal = await result.current('trip-1' as Id<'trips'>);
  });

  expect(create).toHaveBeenCalledWith({ tripId: 'trip-1' });
  expect(proposal).toBeNull();
  expect(toast.error).toHaveBeenCalledWith('Trip is archived');
});

test('creates an idea with a title', async () => {
  const create = vi.fn().mockResolvedValue('proposal-1');
  convex.useMutation.mockReturnValue(create);
  const { result } = await renderHook(() => useCreateIdea());

  let proposal: unknown;
  await act(async () => {
    proposal = await result.current('trip-1' as Id<'trips'>, 'Coast day');
  });

  expect(create).toHaveBeenCalledWith({ title: 'Coast day', tripId: 'trip-1' });
  expect(proposal).toBe('proposal-1');
});
