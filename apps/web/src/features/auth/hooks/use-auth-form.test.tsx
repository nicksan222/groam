import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { authHandlers, resolveAuthDoubles } from '@/features/auth/testing/auth-doubles';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { useAuthForm } from './use-auth-form';

const doubles = await vi.hoisted(async () => {
  const { createAuthDoubles } = await import('@/features/auth/testing/auth-doubles');
  return createAuthDoubles();
});

const auth = authHandlers(doubles);

vi.mock('@groam/auth/client', async () => {
  const { authClientMock } = await import('@/features/auth/testing/auth-doubles');
  return authClientMock(doubles);
});

beforeEach(() => {
  vi.clearAllMocks();
  resolveAuthDoubles(doubles);
  useAuthFormStore.getState().reset();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('useAuthForm', () => {
  beforeEach(() => {
    useAuthFormStore.getState().reset();
  });

  test('signs in with username and password', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ identifier: 'traveler', password: 'password123' })
    );
    await act(() => result.current.submit());
    expect(auth.signIn).toHaveBeenCalledWith({
      callbackURL: window.location.origin + window.location.pathname,
      password: 'password123',
      username: 'traveler'
    });
    expect(result.current.state).toMatchObject({ error: null, isPending: false });
  });

  test('signs in with email and password', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ identifier: 'traveler@example.com', password: 'password123' })
    );
    await act(() => result.current.submit());
    expect(auth.signInEmail).toHaveBeenCalledWith({
      callbackURL: window.location.origin + window.location.pathname,
      email: 'traveler@example.com',
      password: 'password123'
    });
  });

  test('signs up with a real email and username', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        flow: 'signUp',
        identifier: 'traveler',
        name: '  Traveler  ',
        password: 'password123'
      })
    );
    await act(() => result.current.submit());
    expect(auth.signUp).toHaveBeenCalledWith({
      callbackURL: window.location.origin + window.location.pathname,
      email: 'traveler@example.com',
      name: 'Traveler',
      password: 'password123',
      username: 'traveler'
    });
  });

  test('explains the verification step when signup does not create a session', async () => {
    auth.signUp.mockResolvedValue({ data: { token: null }, error: null });
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({
        flow: 'signUp',
        email: 'traveler@example.com',
        identifier: 'traveler',
        name: 'Traveler',
        password: 'password123'
      })
    );
    await act(() => result.current.submit());
    expect(result.current.state.message).toContain('Check your email');
    expect(result.current.state.password).toBe('');
  });

  test('rejects incomplete fields without calling auth', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.updateState({ identifier: 'traveler' }));
    await act(() => result.current.submit());
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Complete every required field to continue.');
  });

  test('rejects passwords shorter than the shared minimum', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.updateState({ identifier: 'traveler', password: 'short' }));

    await act(() => result.current.submit());

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Your password must be at least 8 characters.');
  });

  test('rejects invalid sign-up usernames', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
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
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.switchToRecovery());
    await act(() =>
      result.current.updateState({
        identifier: '  traveler  ',
        newPassword: 'new-password-123',
        recoveryCode: '  ABCD-EFGH-IJKL-MNOP-QRST  '
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

  test('validates recovery fields before calling the provider', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.switchToRecovery());

    await act(() => result.current.submit());
    expect(result.current.state.error).toBe('Complete every required field to continue.');

    await act(() =>
      result.current.updateState({
        identifier: 'traveler',
        newPassword: 'short',
        recoveryCode: 'ABCD-EFGH-IJKL-MNOP-QRST'
      })
    );
    await act(() => result.current.submit());

    expect(auth.recoverAccount).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Your password must be at least 8 characters.');
  });

  test('surfaces recovery and passkey provider errors', async () => {
    auth.recoverAccount.mockResolvedValue({ data: null, error: { message: 'Code expired' } });
    auth.passkey.mockResolvedValue({ data: null, error: { message: 'Passkey cancelled' } });
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.switchToRecovery());
    await act(() =>
      result.current.updateState({
        identifier: 'traveler',
        newPassword: 'new-password-123',
        recoveryCode: 'ABCD-EFGH-IJKL-MNOP-QRST'
      })
    );

    await act(() => result.current.submit());
    expect(result.current.state.error).toBe('Code expired');

    await act(() => result.current.signInWithPasskey());
    expect(result.current.state).toMatchObject({ error: 'Passkey cancelled', isPending: false });
  });

  test('surfaces sign-in auth errors', async () => {
    auth.signIn.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } });
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ identifier: 'traveler', password: 'password123' })
    );
    await act(() => result.current.submit());
    expect(result.current.state).toMatchObject({ error: 'Invalid credentials', isPending: false });
  });

  test('does not trust the browser after authenticator verification', async () => {
    auth.signIn.mockResolvedValue({ data: { twoFactorRedirect: true }, error: null });
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ identifier: 'traveler', password: 'password123' })
    );
    await act(() => result.current.submit());
    await act(() => result.current.updateState({ twoFactorCode: '123456' }));
    await act(() => result.current.submit());

    expect(auth.verifyTotp).toHaveBeenCalledWith({ code: '123456', trustDevice: false });
    expect(auth.verifyBackupCode).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({ needsTwoFactor: false, twoFactorCode: '' });
  });

  test('does not trust the browser after backup-code verification', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ needsTwoFactor: true, twoFactorCode: 'ABCDE-12345' })
    );
    await act(() => result.current.submit());

    expect(auth.verifyTotp).not.toHaveBeenCalled();
    expect(auth.verifyBackupCode).toHaveBeenCalledWith({
      code: 'ABCDE-12345',
      trustDevice: false
    });
    expect(result.current.state).toMatchObject({ needsTwoFactor: false, twoFactorCode: '' });
  });

  test('requires a two-factor code and surfaces invalid backup codes', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.updateState({ needsTwoFactor: true }));

    await act(() => result.current.submit());
    expect(result.current.state.error).toBe('Enter an authenticator or backup code.');

    auth.verifyBackupCode.mockResolvedValue({ data: null, error: { message: 'Invalid backup' } });
    await act(() => result.current.updateState({ twoFactorCode: 'invalid-code' }));
    await act(() => result.current.submit());

    expect(auth.verifyTotp).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({ error: 'Invalid backup', isPending: false });
  });

  test('does not consume a backup-code attempt when an authenticator code fails', async () => {
    auth.verifyTotp.mockResolvedValue({ data: null, error: { message: 'Invalid TOTP' } });
    const { result } = await renderHook(() => useAuthForm());
    await act(() => result.current.updateState({ needsTwoFactor: true, twoFactorCode: '654321' }));

    await act(() => result.current.submit());

    expect(auth.verifyTotp).toHaveBeenCalledWith({ code: '654321', trustDevice: false });
    expect(auth.verifyBackupCode).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      error: 'Invalid TOTP',
      isPending: false,
      needsTwoFactor: true,
      twoFactorCode: '654321'
    });
  });

  test('switchFlow clears the password and error', async () => {
    const { result } = await renderHook(() => useAuthForm());
    await act(() =>
      result.current.updateState({ error: 'Authentication failed', password: 'password123' })
    );
    await act(() => result.current.switchFlow());
    expect(result.current.isSignIn).toBe(false);
    expect(result.current.state).toMatchObject({ error: null, flow: 'signUp', password: '' });
  });
});
