import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useEmailSettings } from './use-email-settings';

const changeEmail = vi.hoisted(() => vi.fn());
vi.mock('@groam/auth/client', () => ({ authClient: { changeEmail } }));
beforeEach(() => {
  vi.clearAllMocks();
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
