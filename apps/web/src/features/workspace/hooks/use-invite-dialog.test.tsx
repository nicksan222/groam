import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useInviteDialog } from './use-invite-dialog';

const auth = vi.hoisted(() => ({
  inviteMember: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    organization: {
      inviteMember: auth.inviteMember
    }
  }
}));

vi.mock('@groam/env/web-client', () => ({
  env: { baseUrl: 'https://app.groam.test/' }
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.inviteMember.mockResolvedValue({ data: { id: 'invite-a' }, error: null });
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
  });
});

test('useInviteDialog creates an invitation link and resets on close', async () => {
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useInviteDialog({ onClose, organizationId: 'organization-a' })
  );

  act(() => {
    result.current.setEmail('teammate@company.com');
  });

  await act(async () => {
    await result.current.submit({
      preventDefault: vi.fn()
    } as unknown as FormEvent);
  });

  expect(auth.inviteMember).toHaveBeenCalledWith({
    email: 'teammate@company.com',
    organizationId: 'organization-a',
    role: 'member'
  });
  expect(result.current.inviteLink).toBe('https://app.groam.test/invitation/invite-a');

  act(() => {
    result.current.close();
  });

  expect(onClose).toHaveBeenCalledOnce();
  expect(result.current.email).toBe('');
  expect(result.current.inviteLink).toBeNull();
});
