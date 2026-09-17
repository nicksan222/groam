import { renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAgentRoster } from './use-agent-roster';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('exposes loading until the agent roster is available', () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = renderHook(() => useAgentRoster());

  expect(result.current).toEqual({ agents: undefined, isLoading: true });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {});
});

test('returns the resolved roster without a loading state', () => {
  const agents = [{ id: 'trip-planner', name: 'Trip planner' }];
  convex.useQuery.mockReturnValue(agents);
  const { result } = renderHook(() => useAgentRoster());

  expect(result.current).toEqual({ agents, isLoading: false });
});
