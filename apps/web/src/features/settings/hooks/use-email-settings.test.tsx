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

function openLink(token: string) {
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}?emailChangeToken=${token}&tab=kept`
  );
}

test('requires a valid email and clears the input once verification is sent', async () => {
  const { result } = await renderHook(() => useEmailSettings());
  await act(() => result.current.save());
  expect(changeEmail).not.toHaveBeenCalled();
  expect(result.current.state.error).toBe('Enter a valid email address.');
  await act(() => result.current.setEmail(' real@example.com '));
  await act(() => result.current.save());
  expect(changeEmail).toHaveBeenCalledWith({ newEmail: 'real@example.com' });
  expect(result.current.state).toMatchObject({ email: '', isPending: false });
  expect(result.current.state.message).toContain('only after you verify');
});

test('surfaces expired-session errors and unlocks the form', async () => {
  changeEmail.mockResolvedValue({ data: null, error: { message: 'Session expired' } });
  const { result } = await renderHook(() => useEmailSettings());
  await act(() => result.current.setEmail('real@example.com'));
  await act(() => result.current.save());
  expect(result.current.state).toMatchObject({ error: 'Session expired', isPending: false });
});

test('confirms email-change links once and removes only the token from the URL', async () => {
  openLink('signed-token');
  const { result } = await renderHook(() => useEmailSettings());
  await vi.waitFor(() =>
    expect(result.current.state.message).toBe('Your new email address is verified.')
  );
  expect(verifyEmail).toHaveBeenCalledTimes(1);
  expect(verifyEmail).toHaveBeenCalledWith({ query: { token: 'signed-token' } });
  expect(window.location.search).toBe('?tab=kept');
});

test('explains when a change-email link cannot be confirmed by the current session', async () => {
  verifyEmail.mockResolvedValue({
    data: null,
    error: { message: 'Sign in again before changing your email.' }
  });
  openLink('stale-token');
  const { result } = await renderHook(() => useEmailSettings());
  await vi.waitFor(() =>
    expect(result.current.state.error).toBe('Sign in again before changing your email.')
  );
  expect(result.current.state.isConfirming).toBe(false);
});
