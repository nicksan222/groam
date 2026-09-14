import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { invitationAuth, resetInvitationAuth } from './invitation-auth';
import { InvitationView } from './invitation-view';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn().mockResolvedValue(null)
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}));

beforeEach(resetInvitationAuth);

afterEach(cleanup);

test('shows list errors on an empty invitation screen', async () => {
  invitationAuth.getInvitation.mockResolvedValue({
    data: null,
    error: { message: 'Invitation not found' }
  });
  render(<InvitationView invitationId="invite-a" />);

  expect(await screen.findByText('Invitation unavailable')).toBeTruthy();
  expect(screen.getByText('Invitation not found')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Return to Groam' }));
  expect(navigate).toHaveBeenCalledWith({ to: '/' });
});

test('keeps accept and decline actions after an accept error', async () => {
  invitationAuth.acceptInvitation.mockResolvedValue({
    data: null,
    error: { message: 'This invitation was already used' }
  });
  render(<InvitationView invitationId="invite-a" />);

  expect(await screen.findByRole('heading', { name: 'Join Acme Labs' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe('This invitation was already used')
  );
  expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Decline' })).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled();
});

test('accepts a valid invitation and returns home', async () => {
  render(<InvitationView invitationId="invite-a" />);

  expect(await screen.findByRole('heading', { name: 'Join Acme Labs' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

  await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }));
  expect(invitationAuth.acceptInvitation).toHaveBeenCalledWith({ invitationId: 'invite-a' });
});
