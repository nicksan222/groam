import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { activateOrganization, useOrganizationActivation } from './use-organization-activation';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), setActive: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { getSession: auth.getSession, organization: { setActive: auth.setActive } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.setActive.mockResolvedValue({ data: {}, error: null });
  auth.getSession.mockResolvedValue({ data: {}, error: null });
});

describe('organization activation', () => {
  test('sets the active organization and refreshes session cookies', async () => {
    await expect(activateOrganization('organization-1')).resolves.toBeUndefined();
    expect(auth.setActive).toHaveBeenCalledWith({ organizationId: 'organization-1' });
    expect(auth.getSession).toHaveBeenCalledOnce();
  });

  test('throws the Better Auth error without refreshing the session', async () => {
    auth.setActive.mockResolvedValue({ data: null, error: { message: 'Denied' } });
    await expect(activateOrganization('organization-1')).rejects.toThrow('Denied');
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  test('activates a first workspace, exposes failures, and retries them', async () => {
    auth.setActive
      .mockResolvedValueOnce({ data: null, error: { message: 'Denied' } })
      .mockResolvedValueOnce({ data: {}, error: null });
    const { result } = renderHook(() =>
      useOrganizationActivation({ firstOrganizationId: 'organization-1', isPending: false })
    );

    await waitFor(() => expect(result.current.error).toBe('Denied'));
    await act(async () => result.current.retry());
    await waitFor(() => expect(auth.setActive).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBeNull();
  });
});
