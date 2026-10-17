import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useResearchLinkOptions } from './use-research-links';

const state = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...state
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: [{ id: 'i1', title: 'Flights' }] })
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: [{ id: 'p1', title: 'Pisa idea' }] })
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.useQuery.mockReturnValue({
    destinations: [
      {
        activities: [{ id: 'a1', title: 'Uffizi' }],
        id: 'd1',
        name: 'Florence',
        stays: [{ id: 's1', title: 'Hotel Arno' }]
      }
    ]
  });
});

test('lists issues, ideas, destinations, activities, and stays', async () => {
  const { result } = await renderHook(() => useResearchLinkOptions('t1' as Id<'trips'>, []));
  expect(result.current.options.map((option) => [option.group, option.label])).toEqual([
    ['Issues', 'Flights'],
    ['Ideas', 'Pisa idea'],
    ['Destinations', 'Florence'],
    ['Activities', 'Uffizi'],
    ['Stays', 'Hotel Arno']
  ]);
});

test('leaves out targets that are already linked', async () => {
  const linked = [
    {
      createdAt: 1,
      createdByName: 'Ada',
      href: null,
      id: 'l1',
      label: 'Flights',
      target: { id: 'i1', kind: 'issue' as const }
    }
  ];
  const { result } = await renderHook(() => useResearchLinkOptions('t1' as Id<'trips'>, linked));
  expect(result.current.options.some((option) => option.label === 'Flights')).toBe(false);
});

test('yields only trip-independent options while data is loading', async () => {
  state.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useResearchLinkOptions('t1' as Id<'trips'>, []));
  expect(result.current.options.map((option) => option.group)).toEqual(['Issues', 'Ideas']);
});

test('handles destinations without stays', async () => {
  state.useQuery.mockReturnValue({
    destinations: [{ activities: [], id: 'd2', name: 'Rome' }]
  });
  const { result } = await renderHook(() => useResearchLinkOptions('t1' as Id<'trips'>, []));
  expect(result.current.options.map((option) => option.label)).toEqual([
    'Flights',
    'Pisa idea',
    'Rome'
  ]);
});
