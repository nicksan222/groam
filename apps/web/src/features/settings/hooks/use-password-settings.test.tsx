import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { usePasswordSettings } from './use-password-settings';

const auth = vi.hoisted(() => ({ changePassword: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { changePassword: auth.changePassword }
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.changePassword.mockResolvedValue({ data: {}, error: null });
});

describe('usePasswordSettings', () => {
  test('changes the password and clears sensitive fields', async () => {
    const { result } = renderHook(() => usePasswordSettings());
    act(() =>
      result.current.updateState({
        confirmPassword: 'new-password',
        currentPassword: 'old-password',
        newPassword: 'new-password'
      })
    );

    await act(() => result.current.save());

    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      revokeOtherSessions: true
    });
    expect(result.current.state).toMatchObject({
      confirmPassword: '',
      currentPassword: '',
      error: null,
      isPending: false,
      message: 'Password updated. Other sessions have been signed out.',
      newPassword: ''
    });
  });

  test('rejects mismatched passwords without calling auth', async () => {
    const { result } = renderHook(() => usePasswordSettings());
    act(() =>
      result.current.updateState({
        confirmPassword: 'another-password',
        currentPassword: 'old-password',
        newPassword: 'new-password'
      })
    );

    await act(() => result.current.save());

    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('The new passwords do not match.');
  });

  test('rejects short passwords without calling auth', async () => {
    const { result } = renderHook(() => usePasswordSettings());
    act(() =>
      result.current.updateState({
        confirmPassword: 'short',
        currentPassword: 'old-password',
        newPassword: 'short'
      })
    );

    await act(() => result.current.save());

    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Your new password must be at least 8 characters.');
  });
});
