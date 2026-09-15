import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { InvitationCode } from '@/types/invitation-codes';
import { InvitationsSection } from './invitations-section';

afterEach(cleanup);

const codes = [
  {
    code: 'ABCD-EFGH-JKLM',
    createdAt: Date.UTC(2026, 8, 15),
    expiresAt: Date.UTC(2026, 8, 22),
    id: 'invitation-code-a',
    role: 'member'
  }
] as InvitationCode[];

test('renders active codes and lets managers copy or revoke them', () => {
  const onCopy = vi.fn();
  const onRevoke = vi.fn();
  render(<InvitationsSection codes={codes} onCopy={onCopy} onRevoke={onRevoke} pendingId={null} />);

  expect(screen.getByText('ABCD-EFGH-JKLM')).toBeTruthy();
  expect(screen.getByText('member')).toBeTruthy();
  expect(screen.getByLabelText('Search invitation codes')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Copy ABCD-EFGH-JKLM' }));
  fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
  expect(onCopy).toHaveBeenCalledWith('ABCD-EFGH-JKLM');
  expect(onRevoke).toHaveBeenCalledWith('invitation-code-a');
});

test('disables revoke while the code is pending', () => {
  render(
    <InvitationsSection
      codes={codes}
      onCopy={vi.fn()}
      onRevoke={vi.fn()}
      pendingId={codes[0]!.id}
    />
  );
  expect(screen.getByRole('button', { name: 'Revoke' })).toHaveProperty('disabled', true);
});

test('renders nothing when there are no active codes', () => {
  const { container } = render(
    <InvitationsSection codes={[]} onCopy={vi.fn()} onRevoke={vi.fn()} pendingId={null} />
  );
  expect(container.innerHTML).toBe('');
});
