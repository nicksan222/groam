import { act, renderHook } from '@groam/vitest-config/react';
import type { FormEvent } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useJoinGroup } from './use-join-group';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redeem: vi.fn(),
  setActive: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: () => mocks.redeem
}));
vi.mock('@groam/backend/api', () => ({
  api: { routes: { organizations: { invitations: { redeem: { run: {} } } } } }
}));
vi.mock('@groam/auth/client', () => ({
  authClient: { getSession: mocks.getSession, organization: { setActive: mocks.setActive } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redeem.mockResolvedValue({ membership: 'joined', organizationId: 'organization-a' });
  mocks.setActive.mockResolvedValue({ data: {}, error: null });
  mocks.getSession.mockResolvedValue({ data: {}, error: null });
});

test('redeems a code and activates the joined group', async () => {
  const onJoined = vi.fn();
  const { result } = await renderHook(() => useJoinGroup({ onJoined }));
  await act(() => result.current.setCode('abcd-efgh-jklm'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(mocks.redeem).toHaveBeenCalledWith({ code: 'abcd-efgh-jklm' });
  expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: 'organization-a' });
  expect(mocks.getSession).toHaveBeenCalledOnce();
  expect(onJoined).toHaveBeenCalledOnce();
  expect(result.current.code).toBe('');
});

test('keeps the code visible when redemption fails', async () => {
  mocks.redeem.mockRejectedValue(new Error('Invitation code not found or already used'));
  const { result } = await renderHook(() => useJoinGroup());
  await act(() => result.current.setCode('BAD-CODE'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(result.current.error).toBe('Invitation code not found or already used');
  expect(result.current.code).toBe('BAD-CODE');
});

test('retries activation without redeeming the consumed code again', async () => {
  const onJoined = vi.fn();
  mocks.setActive
    .mockResolvedValueOnce({ data: null, error: { message: 'Session update failed' } })
    .mockResolvedValueOnce({ data: {}, error: null });
  const { result } = await renderHook(() => useJoinGroup({ onJoined }));
  await act(() => result.current.setCode('abcd-efgh-jklm'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(result.current.error).toBe(
    'You joined the group, but it could not be opened. Try again. Session update failed'
  );
  expect(result.current.code).toBe('');
  expect(result.current.hasPendingActivation).toBe(true);

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(mocks.redeem).toHaveBeenCalledOnce();
  expect(mocks.setActive).toHaveBeenCalledTimes(2);
  expect(mocks.getSession).toHaveBeenCalledOnce();
  expect(result.current.hasPendingActivation).toBe(false);
  expect(result.current.error).toBe(null);
  expect(onJoined).toHaveBeenCalledOnce();
});

test('opens an existing membership without showing a join failure', async () => {
  const onJoined = vi.fn();
  mocks.redeem.mockResolvedValue({
    membership: 'existing',
    organizationId: 'organization-a'
  });
  const { result } = await renderHook(() => useJoinGroup({ onJoined }));
  await act(() => result.current.setCode('abcd-efgh-jklm'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: 'organization-a' });
  expect(mocks.getSession).toHaveBeenCalledOnce();
  expect(result.current.error).toBe(null);
  expect(onJoined).toHaveBeenCalledOnce();
});

test('describes an activation retry accurately for an existing member', async () => {
  mocks.redeem.mockResolvedValue({
    membership: 'existing',
    organizationId: 'organization-a'
  });
  mocks.setActive.mockResolvedValue({ data: null, error: { message: 'Session update failed' } });
  const { result } = await renderHook(() => useJoinGroup());
  await act(() => result.current.setCode('abcd-efgh-jklm'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(result.current.error).toBe(
    'You already belong to this group, but it could not be opened. Try again. Session update failed'
  );
  expect(result.current.code).toBe('');
  expect(result.current.hasPendingActivation).toBe(true);
});
