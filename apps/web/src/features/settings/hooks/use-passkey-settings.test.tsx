import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { usePasskeySettings } from './use-passkey-settings';

const auth = vi.hoisted(() => ({
  addPasskey: vi.fn(),
  deletePasskey: vi.fn(),
  listUserPasskeys: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({ authClient: { passkey: auth } }));

const laptop = {
  backedUp: true,
  createdAt: new Date('2026-09-17T00:00:00Z'),
  id: 'laptop',
  name: 'Laptop'
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.addPasskey.mockResolvedValue({ data: {}, error: null });
  auth.deletePasskey.mockResolvedValue({ data: {}, error: null });
  auth.listUserPasskeys.mockResolvedValue({ data: [laptop], error: null });
});

describe('usePasskeySettings', () => {
  test('loads registered passkeys', async () => {
    const { result } = renderHook(() => usePasskeySettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.passkeys).toEqual([laptop]);
    expect(result.current.error).toBeNull();
  });

  test('adds a named passkey and refreshes the list', async () => {
    const { result } = renderHook(() => usePasskeySettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.add('  Phone  '));

    expect(auth.addPasskey).toHaveBeenCalledWith({ name: 'Phone' });
    expect(auth.listUserPasskeys).toHaveBeenCalledTimes(2);
    expect(result.current.pendingId).toBeNull();
  });

  test('removes a passkey from local state', async () => {
    const { result } = renderHook(() => usePasskeySettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.remove(laptop.id));

    expect(auth.deletePasskey).toHaveBeenCalledWith({ id: laptop.id });
    expect(result.current.passkeys).toEqual([]);
    expect(result.current.pendingId).toBeNull();
  });

  test('keeps the passkey list when removal fails', async () => {
    auth.deletePasskey.mockResolvedValue({ data: null, error: { message: 'Removal failed' } });
    const { result } = renderHook(() => usePasskeySettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.remove(laptop.id));

    expect(result.current.passkeys).toEqual([laptop]);
    expect(result.current).toMatchObject({ error: 'Removal failed', pendingId: null });
  });
});
