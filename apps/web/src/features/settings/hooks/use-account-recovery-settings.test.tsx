import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAccountRecoverySettings } from './use-account-recovery-settings';

const auth = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { accountRecovery: { generate: auth.generate } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.generate.mockResolvedValue({ data: { codes: ['AAAA-BBBB-CCCC-DDDD-EEEE'] }, error: null });
  URL.createObjectURL = vi.fn(() => 'blob:recovery-codes');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

test('verifies the current password and downloads a newly generated code set', async () => {
  const { result } = renderHook(() => useAccountRecoverySettings());

  await act(() => result.current.generate('current-password'));

  expect(auth.generate).toHaveBeenCalledWith({ password: 'current-password' });
  expect(URL.createObjectURL).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recovery-codes');
  expect(result.current).toMatchObject({
    error: null,
    isPending: false,
    message: 'Recovery codes downloaded. Any previous account recovery codes no longer work.'
  });
});

test('surfaces generation failures without downloading a file', async () => {
  auth.generate.mockResolvedValue({ data: null, error: { message: 'Invalid password' } });
  const { result } = renderHook(() => useAccountRecoverySettings());

  await act(() => result.current.generate('wrong-password'));

  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(result.current).toMatchObject({
    error: 'Invalid password',
    isPending: false,
    message: null
  });
});
