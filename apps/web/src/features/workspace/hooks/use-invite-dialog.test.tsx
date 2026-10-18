import { act, renderHook } from '@groam/vitest-config/react';
import type { FormEvent } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useInviteDialog } from './use-invite-dialog';

const backend = vi.hoisted(() => ({
  createInvitation: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useMutation: () => backend.createInvitation
}));

vi.mock('@groam/backend/api', () => ({
  api: { routes: { organizations: { invitations: { create: { run: {} } } } } }
}));

beforeEach(() => {
  vi.clearAllMocks();
  backend.createInvitation.mockResolvedValue({ code: 'ABCD-EFGH-JKLM' });
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
});

test('useInviteDialog creates an invitation code and resets on close', async () => {
  const onClose = vi.fn();
  const { result } = await renderHook(() => useInviteDialog({ onClose }));

  await act(async () => {
    await result.current.submit({
      preventDefault: vi.fn()
    } as unknown as FormEvent);
  });

  expect(backend.createInvitation).toHaveBeenCalledWith({ role: 'member' });
  expect(result.current.invitationCode).toBe('ABCD-EFGH-JKLM');

  await act(async () => {
    await result.current.copyCode();
  });
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-EFGH-JKLM');
  expect(result.current.copied).toBe(true);

  await act(() => {
    result.current.close();
  });

  expect(onClose).toHaveBeenCalledOnce();
  expect(result.current.invitationCode).toBeNull();
});

test('keeps the dialog actionable when creating or copying a code fails', async () => {
  backend.createInvitation.mockRejectedValue(new Error('Invitation limit reached'));
  const { result } = await renderHook(() => useInviteDialog({ onClose: vi.fn() }));
  await act(async () => {
    await result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent);
    await result.current.copyCode();
  });
  expect(result.current.request).toMatchObject({
    error: 'Invitation limit reached',
    isPending: false
  });
  expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
});
