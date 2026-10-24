import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { testIds } from '@/lib/test-ids';
import { GroupsSettings } from './groups-settings';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  switchOrganization: vi.fn(),
  toastError: vi.fn()
}));

const organizations = [
  { id: 'org-acme', logo: null, name: 'Acme Labs' },
  { id: 'org-smith', logo: null, name: 'The Smiths' }
];

vi.mock('@/lib/navigation/router', () => ({ useNavigate: () => state.navigate }));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: state.toastError } }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: organizations[0],
    organizations,
    switchOrganization: state.switchOrganization
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.switchOrganization.mockResolvedValue(undefined);
  useWorkspaceDialogs.getState().closeDialog();
});

test('lists every group, marks the current one, and offers a switch for the others', async () => {
  await render(<GroupsSettings />);
  await expect.element(page.getByText('Acme Labs')).toBeVisible();
  await expect.element(page.getByText('Current')).toBeVisible();
  expect(page.getByTestId(testIds.settingsGroupSwitch).elements()).toHaveLength(1);
});

test('switching stays on the settings page', async () => {
  await render(<GroupsSettings />);
  await page.getByRole('button', { name: 'Switch The Smiths' }).click();
  expect(state.switchOrganization).toHaveBeenCalledWith('org-smith');
  expect(state.navigate).not.toHaveBeenCalled();
});

test('toasts when switching fails', async () => {
  state.switchOrganization.mockRejectedValue(new Error('Forbidden'));
  await render(<GroupsSettings />);
  await page.getByRole('button', { name: 'Switch The Smiths' }).click();
  await expect.poll(() => state.toastError.mock.calls).toEqual([['Forbidden']]);
});

test.each([
  [testIds.settingsGroupJoin, 'join'],
  [testIds.settingsGroupNew, 'create-organization']
] as const)('%s opens the %s dialog', async (id, dialog) => {
  await render(<GroupsSettings />);
  await page.getByTestId(id).click();
  expect(useWorkspaceDialogs.getState().dialog).toBe(dialog);
});
