import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useCurrentTripPreferenceKey, useRememberTrip } from './use-remember-trip';

const state = vi.hoisted(() => ({ orgId: 'org-a' }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: state.orgId },
    session: { user: { id: 'user-1' } }
  })
}));

const key = (orgId: string) => `groam:current-trip:user-1:${orgId}`;

beforeEach(() => {
  window.localStorage.clear();
  state.orgId = 'org-a';
});

describe('useRememberTrip', () => {
  test('remembers a shared trip by short id for this user and group', async () => {
    await renderHook(() =>
      useRememberTrip({ canParticipate: true, proposal: null, shortId: 'abc123' })
    );
    expect(window.localStorage.getItem(key('org-a'))).toBe('abc123');
    expect(window.localStorage.getItem(key('org-b'))).toBeNull();
  });

  test.each([
    [
      'a working copy',
      { canParticipate: true, proposal: { sourceTripId: 'x' }, shortId: 'cpy123' }
    ],
    [
      'a trip the viewer cannot plan in',
      { canParticipate: false, proposal: null, shortId: 'unp123' }
    ],
    ['no trip yet', undefined]
  ])('does not remember %s', async (_, trip) => {
    await renderHook(() => useRememberTrip(trip as never));
    expect(window.localStorage.getItem(key('org-a'))).toBeNull();
  });

  test('keys the preference by group', async () => {
    state.orgId = 'org-b';
    const { result } = await renderHook(() => useCurrentTripPreferenceKey());
    expect(result.current).toBe(key('org-b'));
  });
});
