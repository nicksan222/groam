import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useJoinGroup } from './use-join-group';

const mocks = vi.hoisted(() => ({
  redeem: vi.fn(),
  setActive: vi.fn()
}));

vi.mock('convex/react', () => ({ useMutation: () => mocks.redeem }));
vi.mock('@groam/backend/api', () => ({
  api: { routes: { organizations: { invitations: { redeem: { run: {} } } } } }
}));
vi.mock('@groam/auth/client', () => ({
  authClient: { organization: { setActive: mocks.setActive } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redeem.mockResolvedValue({ organizationId: 'organization-a' });
  mocks.setActive.mockResolvedValue({ data: {}, error: null });
});

test('redeems a code and activates the joined group', async () => {
  const onJoined = vi.fn();
  const { result } = renderHook(() => useJoinGroup({ onJoined }));
  act(() => result.current.setCode('abcd-efgh-jklm'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(mocks.redeem).toHaveBeenCalledWith({ code: 'abcd-efgh-jklm' });
  expect(mocks.setActive).toHaveBeenCalledWith({ organizationId: 'organization-a' });
  expect(onJoined).toHaveBeenCalledOnce();
  expect(result.current.code).toBe('');
});

test('keeps the code visible when redemption fails', async () => {
  mocks.redeem.mockRejectedValue(new Error('Invitation code not found or already used'));
  const { result } = renderHook(() => useJoinGroup());
  act(() => result.current.setCode('BAD-CODE'));

  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
  });

  expect(result.current.error).toBe('Invitation code not found or already used');
  expect(result.current.code).toBe('BAD-CODE');
});
