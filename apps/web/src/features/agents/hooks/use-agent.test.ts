import type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';
import { renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAgent, useAgentRecord } from './use-agent';

const convex = vi.hoisted(() => ({
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => ({
  usePaginatedQuery: (...args: unknown[]) => convex.usePaginatedQuery(...args),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue(undefined);
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [],
    status: 'LoadingFirstPage'
  });
});

test('skips both queries until an agent is selected', () => {
  const { result } = renderHook(() => useAgent(undefined));

  expect(result.current.agent).toBeUndefined();
  expect(result.current.runs).toEqual([]);
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 20
  });
});

test('returns an agent record and its paginated runs', () => {
  const agentId = 'trip-planner' as AssistantAgentId;
  const loadMore = vi.fn();
  const agent = { id: agentId, name: 'Trip planner' };
  const runs = [{ id: 'run-1', status: 'complete' }];
  convex.useQuery.mockReturnValue(agent);
  convex.usePaginatedQuery.mockReturnValue({ loadMore, results: runs, status: 'CanLoadMore' });

  const { result } = renderHook(() => useAgent(agentId));

  expect(result.current).toEqual({ agent, loadMore, runs, status: 'CanLoadMore' });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), { agentId });
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
    expect.anything(),
    { agentId },
    {
      initialNumItems: 20
    }
  );
});

test('normalizes a null agent record to undefined', () => {
  convex.useQuery.mockReturnValue(null);
  const { result } = renderHook(() => useAgentRecord('trip-planner' as AssistantAgentId));

  expect(result.current).toBeUndefined();
});
