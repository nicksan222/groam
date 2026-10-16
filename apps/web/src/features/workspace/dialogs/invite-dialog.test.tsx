import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { InviteDialog } from './invite-dialog';

const invite = vi.hoisted(() => ({
  close: vi.fn(),
  copied: false,
  copyCode: vi.fn(),
  invitationCode: null as string | null,
  request: { error: null as string | null, isPending: false },
  role: 'member' as 'admin' | 'member',
  setRole: vi.fn(),
  submit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
}));
const useInviteDialog = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/hooks/use-invite-dialog', () => ({ useInviteDialog }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-acme', name: 'Acme Labs' } })
}));

beforeEach(() => {
  invite.close.mockClear();
  invite.copied = false;
  invite.copyCode.mockClear();
  invite.invitationCode = null;
  invite.request = { error: null, isPending: false };
  invite.role = 'member';
  invite.setRole.mockClear();
  invite.submit.mockClear();
  useInviteDialog.mockReset();
  useInviteDialog.mockImplementation(() => invite);
});

describe('InviteDialog form', () => {
  test('names the active group and passes onClose to the hook', async () => {
    const onClose = vi.fn();
    await render(<InviteDialog onClose={onClose} open />);
    expect(useInviteDialog).toHaveBeenCalledWith({ onClose });
    await expect.element(page.getByText(/code for Acme Labs/)).toBeVisible();
    await expect.element(page.getByRole('combobox')).toHaveTextContent('Member');
  });

  test('renders nothing while closed', async () => {
    await render(<InviteDialog onClose={vi.fn()} open={false} />);
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows the organizer role when selected', async () => {
    invite.role = 'admin';
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect.element(page.getByRole('combobox')).toHaveTextContent('Organizer');
  });

  test('changing the role calls setRole', async () => {
    await render(<InviteDialog onClose={vi.fn()} open />);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Organizer' }).click();
    expect(invite.setRole).toHaveBeenCalledWith('admin');
  });

  test('submits and closes through the hook', async () => {
    await render(<InviteDialog onClose={vi.fn()} open />);
    await page.getByRole('button', { name: 'Create code' }).click();
    expect(invite.submit).toHaveBeenCalled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(invite.close).toHaveBeenCalled();
  });

  test('disables controls while pending', async () => {
    invite.request = { error: null, isPending: true };
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect.element(page.getByRole('combobox')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  test('shows a request error', async () => {
    invite.request = { error: 'Not allowed', isPending: false };
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect.element(page.getByText('Not allowed')).toBeVisible();
  });
});

describe('InviteDialog created code', () => {
  beforeEach(() => {
    invite.invitationCode = 'ABCD-EFGH-JKLM';
  });

  test('shows the code, copies it and finishes', async () => {
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect.element(page.getByRole('heading', { name: 'Invitation created' })).toBeVisible();
    await expect.element(page.getByLabelText('Invitation code')).toHaveValue('ABCD-EFGH-JKLM');
    await page.getByRole('button', { name: 'Copy invitation code' }).click();
    expect(invite.copyCode).toHaveBeenCalled();
    await page.getByRole('button', { name: 'Done' }).click();
    expect(invite.close).toHaveBeenCalled();
  });

  test('confirms after the code was copied', async () => {
    invite.copied = true;
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect
      .element(page.getByRole('button', { name: 'Invitation code copied' }))
      .toBeVisible();
  });

  test('shows a copy error', async () => {
    invite.request = { error: 'Unable to copy invitation code', isPending: false };
    await render(<InviteDialog onClose={vi.fn()} open />);
    await expect.element(page.getByText('Unable to copy invitation code')).toBeVisible();
  });
});
