import { renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAiAvailability } from './use-ai-availability';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  convex.useQuery.mockReset();
});

test('hides the AI tab while deployment availability is loading', () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: false, hideAi: true });
});

test('hides the AI tab for a deployment-managed provider', () => {
  convex.useQuery.mockReturnValue({ environmentConfigured: true });
  const { result } = renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: true, hideAi: true });
});

test('shows the AI tab when users may manage credentials', () => {
  convex.useQuery.mockReturnValue({ environmentConfigured: false });
  const { result } = renderHook(() => useAiAvailability());
  expect(result.current).toEqual({ environmentConfigured: false, hideAi: false });
});
