import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useAiAvailability } from './use-ai-availability';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  convex.useQuery.mockReset();
});

test('hides the AI tab while deployment availability is loading', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: false, hideAi: true, isLoading: true });
});

test('hides the AI tab for a deployment-managed provider', async () => {
  convex.useQuery.mockReturnValue({ environmentConfigured: true });
  const { result } = await renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: true, hideAi: true, isLoading: false });
});

test('shows the AI tab when users may manage credentials', async () => {
  convex.useQuery.mockReturnValue({ environmentConfigured: false });
  const { result } = await renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: false, hideAi: false, isLoading: false });
});
