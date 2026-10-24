import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useWorkspaceData } from './use-workspace-data';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  list: vi.fn(),
  setActive: vi.fn(),
  useActiveOrganization: vi.fn(),
  useListOrganizations: vi.fn(),
  useSession: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    getSession: auth.getSession,
    organization: {
      list: auth.list,
      setActive: auth.setActive
    },
    useActiveOrganization: auth.useActiveOrganization,
    useListOrganizations: auth.useListOrganizations,
    useSession: auth.useSession
  }
}));

const organization = {
  id: 'organization-a',
  invitations: [],
  members: [{ id: 'member-a', role: 'owner', userId: 'user-a' }],
  name: 'Acme',
  slug: 'acme'
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.useSession.mockReturnValue({
    data: {
      session: { activeOrganizationId: 'organization-a' },
      user: { id: 'user-a', name: 'Ada' }
    },
    isPending: false
  });
  auth.useListOrganizations.mockReturnValue({ data: [organization], isPending: false });
  auth.useActiveOrganization.mockReturnValue({ data: organization, isPending: false });
  auth.list.mockResolvedValue({ data: [organization], error: null });
  auth.setActive.mockResolvedValue({ data: null, error: null });
  auth.getSession.mockResolvedValue({ data: null, error: null });
});

test('combines stable workspace identity from the active organization', async () => {
  const { result } = await renderHook(() => useWorkspaceData());

  expect(result.current.value).toMatchObject({
    activeOrganization: organization,
    activeRole: 'owner'
  });
});

test('activates the first organization when the session has no active workspace', async () => {
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: false });
  await renderHook(() => useWorkspaceData());

  await vi.waitFor(() =>
    expect(auth.setActive).toHaveBeenCalledWith({ organizationId: 'organization-a' })
  );
  expect(auth.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
});

test('does not expose an active organization cached from an older session', async () => {
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  const { result } = await renderHook(() => useWorkspaceData());

  expect(result.current.value).toBeNull();
  await vi.waitFor(() =>
    expect(auth.setActive).toHaveBeenCalledWith({ organizationId: 'organization-a' })
  );
});

test('surfaces active workspace failures instead of loading forever', async () => {
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: false });
  auth.setActive.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
  const { result } = await renderHook(() => useWorkspaceData());

  await vi.waitFor(() => expect(result.current.activationError).toBe('Access denied'));
  expect(result.current.isPending).toBe(false);
});

test('ignores a stale activation failure after the workspace becomes active', async () => {
  let finishActivation: (value: unknown) => void = () => undefined;
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: false });
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  auth.setActive.mockReturnValue(
    new Promise((resolve) => {
      finishActivation = resolve;
    })
  );
  const { rerender, result } = await renderHook(() => useWorkspaceData());

  await vi.waitFor(() => expect(auth.setActive).toHaveBeenCalledOnce());
  auth.useActiveOrganization.mockReturnValue({ data: organization, isPending: false });
  auth.useSession.mockReturnValue({
    data: {
      session: { activeOrganizationId: 'organization-a' },
      user: { id: 'user-a', name: 'Ada' }
    },
    isPending: false
  });
  await rerender();
  await act(() => {
    finishActivation({ data: null, error: { message: 'Stale failure' } });
  });

  expect(result.current.activationError).toBeNull();
  expect(result.current.value?.activeOrganization).toBe(organization);
});

test('keeps settled onboarding ready during background organization refetches', async () => {
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  auth.useListOrganizations.mockReturnValue({ data: [], isPending: false });
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: false });
  const { result, rerender } = await renderHook(() => useWorkspaceData());
  expect(result.current.isPending).toBe(false);

  auth.useListOrganizations.mockReturnValue({ data: [], isPending: false });
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: true });
  await rerender();

  expect(result.current.isPending).toBe(false);
  expect(result.current.value).toBeNull();
  expect(auth.setActive).not.toHaveBeenCalled();
});

test('waits for the organization list before offering onboarding', async () => {
  auth.useSession.mockReturnValue({
    data: { session: {}, user: { id: 'user-a', name: 'Ada' } },
    isPending: false
  });
  auth.useListOrganizations.mockReturnValue({ data: null, isPending: true });
  auth.useActiveOrganization.mockReturnValue({ data: null, isPending: true });
  const { result } = await renderHook(() => useWorkspaceData());
  expect(result.current.isPending).toBe(true);
  expect(result.current.value).toBeNull();
});
