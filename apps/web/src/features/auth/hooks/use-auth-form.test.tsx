import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { auth } from '@/features/auth/auth-client-mock';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { useAuthForm } from './use-auth-form';

describe('useAuthForm', () => {
  beforeEach(() => useAuthFormStore.getState().reset());

  test('signs in with username and password', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ identifier: 'traveler', password: 'password123' }));
    await act(() => result.current.submit());
    expect(auth.signIn).toHaveBeenCalledWith({ password: 'password123', username: 'traveler' });
    expect(result.current.state).toMatchObject({ error: null, isPending: false });
  });

  test('keeps legacy email sign-in working', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({ identifier: 'traveler@example.com', password: 'password123' })
    );
    await act(() => result.current.submit());
    expect(auth.signInEmail).toHaveBeenCalledWith({
      email: 'traveler@example.com',
      password: 'password123'
    });
  });

  test('signs up with a username and internal placeholder email', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        flow: 'signUp',
        identifier: 'traveler',
        name: '  Traveler  ',
        password: 'password123'
      })
    );
    await act(() => result.current.submit());
    expect(auth.signUp).toHaveBeenCalledWith({
      email: expect.stringMatching(/^[0-9a-f-]+@users\.invalid$/u),
      name: 'Traveler',
      password: 'password123',
      username: 'traveler'
    });
  });

  test('rejects incomplete fields without calling auth', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ identifier: 'traveler' }));
    await act(() => result.current.submit());
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Complete every required field to continue.');
  });

  test('rejects invalid sign-up usernames', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        flow: 'signUp',
        identifier: 'not valid',
        name: 'Traveler',
        password: 'password123'
      })
    );
    await act(() => result.current.submit());
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(result.current.state.error).toContain('letters, numbers');
  });

  test('resets a forgotten password with a saved recovery code', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.switchToRecovery());
    act(() =>
      result.current.updateState({
        identifier: 'traveler',
        newPassword: 'new-password-123',
        recoveryCode: 'ABCD-EFGH-IJKL-MNOP-QRST'
      })
    );
    await act(() => result.current.submit());
    expect(auth.recoverAccount).toHaveBeenCalledWith({
      code: 'ABCD-EFGH-IJKL-MNOP-QRST',
      newPassword: 'new-password-123',
      username: 'traveler'
    });
    expect(result.current.state.flow).toBe('signIn');
  });

  test('surfaces sign-in auth errors', async () => {
    auth.signIn.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } });
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ identifier: 'traveler', password: 'password123' }));
    await act(() => result.current.submit());
    expect(result.current.state).toMatchObject({ error: 'Invalid credentials', isPending: false });
  });

  test('does not trust the browser after authenticator verification', async () => {
    auth.signIn.mockResolvedValue({ data: { twoFactorRedirect: true }, error: null });
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ identifier: 'traveler', password: 'password123' }));
    await act(() => result.current.submit());
    act(() => result.current.updateState({ twoFactorCode: '123456' }));
    await act(() => result.current.submit());

    expect(auth.verifyTotp).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
    expect(auth.verifyBackupCode).not.toHaveBeenCalled();
  });

  test('does not trust the browser after backup-code verification', async () => {
    auth.verifyTotp.mockResolvedValue({ data: null, error: { message: 'Invalid code' } });
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ needsTwoFactor: true, twoFactorCode: 'backup-code' }));
    await act(() => result.current.submit());

    expect(auth.verifyBackupCode).toHaveBeenCalledWith({
      code: 'backup-code',
      trustDevice: false
    });
  });

  test('switchFlow clears the password and error', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({ error: 'Authentication failed', password: 'password123' })
    );
    act(() => result.current.switchFlow());
    expect(result.current.isSignIn).toBe(false);
    expect(result.current.state).toMatchObject({ error: null, flow: 'signUp', password: '' });
  });
});
