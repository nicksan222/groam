import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useResearch } from './use-research';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

beforeEach(() => vi.clearAllMocks());

test('maps the backend detail onto the UI shape', async () => {
  convex.useQuery.mockReturnValue({
    brief: null,
    canManage: true,
    id: 'r1',
    links: [
      {
        id: 'l1',
        kind: 'issue',
        label: 'Flights',
        shortId: 'is1',
        target: { issueId: 'i1', kind: 'issue' },
        targetKey: 'issue:i1'
      }
    ],
    shortId: 'rs1',
    threadId: 'th1',
    title: 'Hotels',
    tripId: 't1',
    writable: false
  });
  const { result } = await renderHook(() => useResearch('r1' as Id<'discussions'>));
  expect(result.current.threadId).toBe('th1');
  expect(result.current.writable).toBe(false);
  expect(result.current.research?.links).toEqual([
    { href: '/issues/is1', id: 'l1', label: 'Flights', target: { id: 'i1', kind: 'issue' } }
  ]);
});

test('is loading until the query resolves', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useResearch('r1' as Id<'discussions'>));
  expect(result.current).toMatchObject({ isLoading: true, research: undefined, writable: false });
});

test('links resolve hrefs per kind and null without a short id', async () => {
  const link = (id: string, kind: string, shortId: null | string, target: object) => ({
    id,
    kind,
    label: id,
    shortId,
    target,
    targetKey: id
  });
  convex.useQuery.mockReturnValue({
    brief: 'b',
    canManage: false,
    id: 'r1',
    links: [
      link('a', 'idea', 'id1', { kind: 'idea', proposalId: 'p1' }),
      link('b', 'issue', null, { issueId: 'i1', kind: 'issue' }),
      link('c', 'stay', 'st1', { kind: 'tripTarget', target: { id: 's1', type: 'stay' } })
    ],
    shortId: 'rs1',
    threadId: null,
    title: 'Hotels',
    tripId: 't1',
    writable: true
  });
  const { result } = await renderHook(() => useResearch('r1' as Id<'discussions'>));
  expect(result.current.research?.links.map((l) => [l.href, l.target])).toEqual([
    ['/ideas/id1', { id: 'p1', kind: 'idea' }],
    [null, { id: 'i1', kind: 'issue' }],
    [null, { id: 's1', kind: 'stay' }]
  ]);
  expect(result.current.threadId).toBeNull();
  expect(result.current.writable).toBe(true);
});
