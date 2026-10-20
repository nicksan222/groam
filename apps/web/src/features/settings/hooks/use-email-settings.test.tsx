import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useEmailSettings } from './use-email-settings';

const { changeEmail, verifyEmail } = vi.hoisted(() => ({
  changeEmail: vi.fn(),
  verifyEmail: vi.fn()
}));
vi.mock('@groam/auth/client', () => ({ authClient: { changeEmail, verifyEmail } }));
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(window.history.state, '', window.location.pathname);
  verifyEmail.mockResolvedValue({ data: {}, error: null });
  changeEmail.mockResolvedValue({ data: {}, error: null });
});

test('requires a valid email and explains verification before the change takes effect', async () => {
  const { result } = await renderHook(() => useEmailSettings());
  await act(() => result.current.save());
  expect(changeEmail).not.toHaveBeenCalled();
  expect(result.current.state.error).toBe('Enter a valid email address.');
  await act(() => result.current.setEmail(' real@example.com '));
  await act(() => result.current.save());
  expect(changeEmail).toHaveBeenCalledWith({
    newEmail: 'real@example.com',
    callbackURL: window.location.origin + window.location.pathname
  });
  expect(result.current.state.message).toContain('only after you verify');
});

test('surfaces expired-session errors and unlocks the form', async () => {
  changeEmail.mockResolvedValue({ data: null, error: { message: 'Session expired' } });
  const { result } = await renderHook(() => useEmailSettings());
  await act(() => result.current.setEmail('real@example.com'));
  await act(() => result.current.save());
  expect(result.current.state).toMatchObject({ error: 'Session expired', pending: false });
});

test('surfaces and removes verification callback errors without exposing raw query text', async () => {
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + '?error=invalid_token'
  );
  const { result } = await renderHook(() => useEmailSettings());
  expect(result.current.state.error).toBe(
    'This email verification link is invalid or expired. Request a new link.'
  );
  expect(new URLSearchParams(window.location.search).has('error')).toBe(false);
});

test('consumes email-change links through the authenticated client and clears the URL token', async () => {
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + '?emailChangeToken=signed-token'
  );
  const { result } = await renderHook(() => useEmailSettings());
  await vi.waitFor(() =>
    expect(result.current.state.message).toBe('Your new email address is verified.')
  );
  expect(verifyEmail).toHaveBeenCalledWith({ query: { token: 'signed-token' } });
  expect(window.location.search).toBe('');
});

test('explains when a change-email link cannot be confirmed by the current session', async () => {
  verifyEmail.mockResolvedValue({
    data: null,
    error: { message: 'Sign in again before confirming this email change.' }
  });
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + '?emailChangeToken=expired-token'
  );
  const { result } = await renderHook(() => useEmailSettings());
  await vi.waitFor(() =>
    expect(result.current.state.error).toBe('Sign in again before confirming this email change.')
  );
  expect(result.current.state.pending).toBe(false);
});
