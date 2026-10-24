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

const nav = vi.hoisted(() => ({ navigate: vi.fn(), setOpenMobile: vi.fn() }));

vi.mock('@groam/ui/hooks/use-sidebar', () => ({ useSidebar: () => nav }));
vi.mock('@/lib/navigation/router', () => ({ useNavigate: () => nav.navigate }));
vi.mock('@/features/trips/hooks/use-trips', () => ({ useTrips: () => ({ createTrip: vi.fn() }) }));
vi.mock('@/features/trips/trip-create/create-trip-dialog', () => ({
  CreateTripDialog: ({ onCreated }: { onCreated: (tripId: string) => void }) => (
    <button onClick={() => onCreated('trip-9')}>Finish trip</button>
  )
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

  test('creating a trip closes the dialog and opens the new trip', async () => {
    useWorkspaceDialogs.getState().openDialog('create-trip');
    await render(<WorkspaceDialogs />);
    await page.getByRole('button', { name: 'Finish trip' }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBeNull();
    expect(nav.navigate).toHaveBeenCalledWith({
      params: { section: 'plan', tripId: 'trip-9' },
      to: '/trips/$tripId/$section'
    });
  });
});
