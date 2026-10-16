import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { OrganizationSettings } from './organization-settings';

const org = vi.hoisted(() => ({
  clearLogo: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  state: {
    error: null as string | null,
    isPending: false,
    logo: '',
    message: null as string | null,
    name: 'Acme Labs',
    slug: 'acme-labs'
  },
  updateState: vi.fn(),
  uploadLogo: vi.fn()
}));

vi.mock('@/features/settings/hooks/use-organization-settings', () => ({
  useOrganizationSettings: () => org
}));

const organization = { id: 'org-1', name: 'Acme Labs', slug: 'acme-labs' } as ActiveOrganization;

beforeEach(() => {
  vi.clearAllMocks();
  org.state = {
    error: null,
    isPending: false,
    logo: '',
    message: null,
    name: 'Acme Labs',
    slug: 'acme-labs'
  };
});

describe('OrganizationSettings', () => {
  test('managers can edit and save the profile', async () => {
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByLabelText('Group name')).toBeEnabled();
    await expect.element(page.getByLabelText('Slug')).toBeEnabled();
    await expect.element(page.getByRole('button', { name: 'Upload logo' })).toBeVisible();
    await expect
      .element(page.getByText('Logo uploads also appear in the group media library.'))
      .toBeVisible();
    await page.getByRole('button', { name: /Save changes/ }).click();
    expect(org.save).toHaveBeenCalledTimes(1);
  });

  test('non-managers get a read-only profile', async () => {
    await render(
      <OrganizationSettings canManage={false} isOwner={false} organization={organization} />
    );
    await expect.element(page.getByLabelText('Group name')).toBeDisabled();
    await expect.element(page.getByLabelText('Slug')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: /Save changes/ })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Upload logo' })).not.toBeInTheDocument();
    await expect
      .element(page.getByText('Only owners and admins can edit these settings.'))
      .toBeVisible();
  });

  test('normalizes the slug and updates the name', async () => {
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await page.getByLabelText('Slug').fill('My Group!');
    expect(org.updateState).toHaveBeenLastCalledWith({ slug: 'my-group-' });
    await page.getByLabelText('Group name').fill('New');
    expect(org.updateState).toHaveBeenLastCalledWith({ name: 'New' });
  });

  test.each([
    ['blank name', { name: '  ' }],
    ['blank slug', { slug: '' }],
    ['pending', { isPending: true }]
  ])('save is disabled with a %s', async (_, patch) => {
    Object.assign(org.state, patch);
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByRole('button', { name: /Save changes/ })).toBeDisabled();
  });

  test('offers logo replacement and removal when a logo exists', async () => {
    org.state.logo = 'https://example.com/logo.png';
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByRole('button', { name: 'Replace logo' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove logo' }).click();
    expect(org.clearLogo).toHaveBeenCalledTimes(1);
  });

  test('shows the placeholder name and slug when blank', async () => {
    org.state.name = '';
    org.state.slug = '';
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByText('Untitled group')).toBeVisible();
    await expect.element(page.getByText('/slug')).toBeVisible();
  });

  test('shows error feedback', async () => {
    org.state.error = 'Slug already taken';
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByText('Slug already taken')).toBeVisible();
  });

  test('hides the danger zone from non-owners', async () => {
    await render(<OrganizationSettings canManage isOwner={false} organization={organization} />);
    await expect.element(page.getByTestId(testIds.deleteGroup)).not.toBeInTheDocument();
  });

  test('owners can delete the group after confirming', async () => {
    await render(<OrganizationSettings canManage isOwner organization={organization} />);
    await page.getByTestId(testIds.deleteGroup).click();
    await expect.element(page.getByText('Delete Acme Labs?')).toBeVisible();
    await page.getByTestId(testIds.deleteGroupConfirm).click();
    expect(org.remove).toHaveBeenCalledTimes(1);
  });

  test('cancelling the delete dialog keeps the group', async () => {
    await render(<OrganizationSettings canManage isOwner organization={organization} />);
    await page.getByTestId(testIds.deleteGroup).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(org.remove).not.toHaveBeenCalled();
  });
});
