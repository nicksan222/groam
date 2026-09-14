import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useSessionSettings } from './use-session-settings';

const auth = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    listSessions: auth.listSessions,
    revokeOtherSessions: auth.revokeOtherSessions,
    revokeSession: auth.revokeSession
  }
}));

const currentSession = {
  createdAt: new Date('2026-01-01T12:00:00Z'),
  expiresAt: new Date('2026-02-01T12:00:00Z'),
  id: 'session-current',
  token: 'current-token',
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  userId: 'user-a'
};
const otherSession = { ...currentSession, id: 'session-other', token: 'other-token' };

beforeEach(() => {
  vi.clearAllMocks();
  auth.listSessions.mockResolvedValue({ data: [currentSession, otherSession], error: null });
  auth.revokeOtherSessions.mockResolvedValue({ data: { status: true }, error: null });
  auth.revokeSession.mockResolvedValue({ data: { status: true }, error: null });
});

describe('useSessionSettings', () => {
  test('loads sessions and revokes one by token', async () => {
    const { result } = renderHook(() => useSessionSettings());

    await waitFor(() => expect(result.current.state.sessions).toHaveLength(2));
    await act(() => result.current.revoke('other-token'));

    expect(auth.revokeSession).toHaveBeenCalledWith({ token: 'other-token' });
    expect(result.current.state.sessions).toEqual([currentSession]);
    expect(result.current.state.pendingAction).toBeNull();
  });

  test('signs out every session except the current one', async () => {
    const { result } = renderHook(() => useSessionSettings());

    await waitFor(() => expect(result.current.state.sessions).toHaveLength(2));
    await act(() => result.current.revokeOthers('current-token'));

    expect(auth.revokeOtherSessions).toHaveBeenCalledOnce();
    expect(result.current.state.sessions).toEqual([currentSession]);
  });

  test('surfaces load errors and allows a retry', async () => {
    auth.listSessions.mockResolvedValueOnce({
      data: null,
      error: { message: 'Sessions unavailable' }
    });
    const { result } = renderHook(() => useSessionSettings());

    await waitFor(() => expect(result.current.state.error).toBe('Sessions unavailable'));
    await act(() => result.current.refresh());

    expect(result.current.state.error).toBeNull();
    expect(result.current.state.sessions).toHaveLength(2);
  });
});
