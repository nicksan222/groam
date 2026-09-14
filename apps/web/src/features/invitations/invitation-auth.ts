import { vi } from 'vitest';

export const invitationAuth = {
  acceptInvitation: vi.fn(),
  getInvitation: vi.fn(),
  rejectInvitation: vi.fn()
};

vi.mock('@groam/auth/client', () => ({
  authClient: {
    organization: {
      acceptInvitation: (...args: unknown[]) => invitationAuth.acceptInvitation(...args),
      getInvitation: (...args: unknown[]) => invitationAuth.getInvitation(...args),
      rejectInvitation: (...args: unknown[]) => invitationAuth.rejectInvitation(...args)
    }
  }
}));

export const invitationFixture = {
  email: 'teammate@company.com',
  id: 'invite-a',
  inviterEmail: 'owner@company.com',
  organizationName: 'Acme Labs',
  role: 'member'
};

export function resetInvitationAuth() {
  vi.clearAllMocks();
  invitationAuth.getInvitation.mockResolvedValue({ data: invitationFixture, error: null });
  invitationAuth.acceptInvitation.mockResolvedValue({ data: {}, error: null });
  invitationAuth.rejectInvitation.mockResolvedValue({ data: {}, error: null });
}
