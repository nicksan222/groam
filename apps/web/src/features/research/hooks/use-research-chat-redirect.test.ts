import { renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { useResearchChatRedirect } from './use-research-chat-redirect';

const state = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...state
}));

test('returns the research page params for a research id', async () => {
  state.useQuery.mockReturnValue({ id: 'd1', kind: 'research', shortId: 'rs1', tripId: 't1' });
  const { result } = await renderHook(() => useResearchChatRedirect('d1'));
  expect(result.current).toEqual({ kind: 'research', researchId: 'rs1', tripId: 't1' });
});

test.each([
  undefined,
  null,
  { id: 'd1', kind: 'group', shortId: 'd1' },
  { id: 'd2', kind: 'group', shortId: 'ch2', tripId: 't1' },
  { id: 'x', shortId: 'x' }
])('returns null for %j', async (resolved) => {
  state.useQuery.mockReturnValue(resolved);
  const { result } = await renderHook(() => useResearchChatRedirect('d1'));
  expect(result.current).toBeNull();
});
