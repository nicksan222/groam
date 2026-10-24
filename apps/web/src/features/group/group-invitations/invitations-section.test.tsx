import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { InvitationCode } from '@/types/invitation-codes';
import { InvitationsSection } from './invitations-section';

const codes = [
  {
    code: 'ABCD-EFGH-JKLM',
    createdAt: Date.UTC(2026, 8, 15),
    expiresAt: Date.UTC(2026, 8, 22),
    id: 'invitation-code-a',
    role: 'member'
  }
] as InvitationCode[];

test('renders active codes and lets managers copy or revoke them', async () => {
  const onCopy = vi.fn();
  const onRevoke = vi.fn();
  await render(
    <InvitationsSection codes={codes} onCopy={onCopy} onRevoke={onRevoke} pendingId={null} />
  );

  await expect.element(page.getByRole('list', { name: 'Invitation codes' })).toBeVisible();
  await expect.element(page.getByText('ABCD-EFGH-JKLM')).toBeInTheDocument();
  await expect.element(page.getByText('member')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Search invitation codes')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Copy ABCD-EFGH-JKLM' }).click();
  await page.getByRole('button', { name: 'Revoke' }).click();
  expect(onCopy).toHaveBeenCalledWith('ABCD-EFGH-JKLM');
  expect(onRevoke).toHaveBeenCalledWith('invitation-code-a');
});

test('disables revoke while the code is pending', async () => {
  await render(
    <InvitationsSection
      codes={codes}
      onCopy={vi.fn()}
      onRevoke={vi.fn()}
      pendingId={codes[0]!.id}
    />
  );
  await expect.element(page.getByRole('button', { name: 'Revoke' })).toBeDisabled();
});

test('renders nothing when there are no active codes', async () => {
  const { container } = await render(
    <InvitationsSection codes={[]} onCopy={vi.fn()} onRevoke={vi.fn()} pendingId={null} />
  );
  expect(container.innerHTML).toBe('');
});

test('searches invitation codes and restores them after clearing', async () => {
  await render(
    <InvitationsSection codes={codes} onCopy={vi.fn()} onRevoke={vi.fn()} pendingId={null} />
  );
  const search = page.getByRole('searchbox', { name: 'Search invitation codes' });
  await search.fill('MEMBER');
  await expect.element(page.getByText('ABCD-EFGH-JKLM')).toBeVisible();
  await search.fill('Nothing');
  await expect.element(page.getByText('No invitation codes match your search.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear invitation code filters' }).click();
  await expect.element(page.getByText('ABCD-EFGH-JKLM')).toBeVisible();
});

test('keeps copy and revoke reachable on phones without horizontal overflow', async () => {
  await useViewport(390, 844);
  const onCopy = vi.fn();
  const onRevoke = vi.fn();
  await render(
    <InvitationsSection codes={codes} onCopy={onCopy} onRevoke={onRevoke} pendingId={null} />
  );
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
  await page.getByRole('button', { name: 'Copy ABCD-EFGH-JKLM' }).click();
  await page.getByRole('button', { name: 'Revoke' }).click();
  expect(onCopy).toHaveBeenCalledWith('ABCD-EFGH-JKLM');
  expect(onRevoke).toHaveBeenCalledWith('invitation-code-a');
});
