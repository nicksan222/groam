import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useGroupActivationStore } from '@/lib/stores/group-activation-store';
import { activateOrganization, useOrganizationActivation } from './use-organization-activation';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), setActive: vi.fn() }));

vi.mock('@groam/auth/client', () => ({
  authClient: { getSession: auth.getSession, organization: { setActive: auth.setActive } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  useGroupActivationStore.setState({ organizationId: null });
  auth.setActive.mockResolvedValue({ data: {}, error: null });
  auth.getSession.mockResolvedValue({ data: {}, error: null });
});

describe('organization activation', () => {
  test('pauses the workspace for the group, sets it active and refreshes session cookies', async () => {
    auth.setActive.mockImplementation(async () => {
      expect(useGroupActivationStore.getState().organizationId).toBe('organization-1');
      return { data: {}, error: null };
    });
    await expect(activateOrganization('organization-1')).resolves.toBeUndefined();
    expect(auth.setActive).toHaveBeenCalledWith({ organizationId: 'organization-1' });
    expect(auth.getSession).toHaveBeenCalledOnce();
    // The workspace resumes once the session reports the group, not before.
    expect(useGroupActivationStore.getState().organizationId).toBe('organization-1');
  });

  test('throws the Better Auth error, resumes the workspace and skips the refresh', async () => {
    auth.setActive.mockResolvedValue({ data: null, error: { message: 'Denied' } });
    await expect(activateOrganization('organization-1')).rejects.toThrow('Denied');
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(useGroupActivationStore.getState().organizationId).toBeNull();
  });

  test('activates a first workspace, exposes failures, and retries them', async () => {
    auth.setActive
      .mockResolvedValueOnce({ data: null, error: { message: 'Denied' } })
      .mockResolvedValueOnce({ data: {}, error: null });
    const { result } = await renderHook(() =>
      useOrganizationActivation({ firstOrganizationId: 'organization-1', isPending: false })
    );

    await vi.waitFor(() => expect(result.current.error).toBe('Denied'));
    await act(async () => result.current.retry());
    await vi.waitFor(() => expect(auth.setActive).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBeNull();
  });
});
