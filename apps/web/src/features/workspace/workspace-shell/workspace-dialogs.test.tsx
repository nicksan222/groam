import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useWorkspaceDialogs } from './workspace-dialog-state';
import { WorkspaceDialogs } from './workspace-dialogs';

vi.mock('@/features/workspace/dialogs/create-organization-dialog', () => ({
  CreateOrganizationDialog: ({ open }: { open: boolean }) =>
    open ? <p>Create dialog open</p> : null
}));
vi.mock('@/features/workspace/dialogs/invite-dialog', () => ({
  InviteDialog: ({ open }: { open: boolean }) => (open ? <p>Invite dialog open</p> : null)
}));
vi.mock('@/features/workspace/dialogs/join-group-dialog', () => ({
  JoinGroupDialog: ({ onClose, open }: { onClose: () => void; open: boolean }) =>
    open ? <button onClick={onClose}>Close join</button> : null
}));

beforeEach(() => useWorkspaceDialogs.getState().closeDialog());

describe('WorkspaceDialogs', () => {
  test('renders no dialog by default', async () => {
    await render(<WorkspaceDialogs />);
    await expect.element(page.getByText(/dialog open/)).not.toBeInTheDocument();
  });

  test.each([
    ['create-organization', 'Create dialog open'],
    ['invite', 'Invite dialog open']
  ] as const)('opens only the %s dialog', async (dialog, text) => {
    useWorkspaceDialogs.getState().openDialog(dialog);
    await render(<WorkspaceDialogs />);
    await expect.element(page.getByText(text)).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Close join' })).not.toBeInTheDocument();
  });

  test('opens the join dialog and closes it through the store', async () => {
    useWorkspaceDialogs.getState().openDialog('join');
    await render(<WorkspaceDialogs />);
    await page.getByRole('button', { name: 'Close join' }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBeNull();
    await expect.element(page.getByRole('button', { name: 'Close join' })).not.toBeInTheDocument();
  });
});
