import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { MembersSection } from './members-section';

function makeMember(id: string, name: string, role: string, username?: string) {
  return {
    id: `member-${id}`,
    role,
    user: { id: `user-${id}`, image: null, name, username: username ?? null },
    userId: `user-${id}`
  };
}

function makeOrganization(members = defaultMembers()): ActiveOrganization {
  return { id: 'org-1', members, name: 'Acme Labs' } as unknown as ActiveOrganization;
}

function defaultMembers() {
  return [
    makeMember('owner', 'Olive Owner', 'owner', 'olive'),
    makeMember('me', 'Mia Member', 'member'),
    makeMember('bob', 'Bob Builder', 'admin')
  ];
}

const handlers = {
  onLeave: vi.fn(),
  onRemove: vi.fn(),
  onRoleChange: vi.fn()
};

async function renderSection(
  props: {
    canManage?: boolean;
    organization?: ActiveOrganization;
    pendingAction?: string | null;
    viewerUserId?: string;
  } = {}
) {
  return render(
    <MembersSection
      canManage={props.canManage ?? false}
      onLeave={handlers.onLeave}
      onRemove={handlers.onRemove}
      onRoleChange={handlers.onRoleChange}
      organization={props.organization ?? makeOrganization()}
      pendingAction={props.pendingAction ?? null}
      viewerUserId={props.viewerUserId ?? 'user-me'}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MembersSection', () => {
  test('lists members with identity, role, and a (you) marker', async () => {
    await renderSection();
    await expect.element(page.getByRole('list', { name: 'Members' })).toBeVisible();
    await expect.element(page.getByText('Olive Owner')).toBeVisible();
    await expect.element(page.getByText('@olive')).toBeVisible();
    await expect.element(page.getByText('Mia Member (you)')).toBeVisible();
    await expect.element(page.getByText('Bob Builder').first()).toBeVisible();
    await expect.element(page.getByText('owner', { exact: true })).toBeVisible();
  });

  test('shows an empty list without members', async () => {
    await renderSection({ organization: makeOrganization([]) });
    await expect.element(page.getByText('Olive Owner')).not.toBeInTheDocument();
    await expect.element(page.getByRole('status')).toHaveTextContent('No members yet.');
  });

  test('viewer can leave the group unless they own it', async () => {
    await renderSection();
    await page.getByRole('button', { name: 'Leave' }).click();
    expect(handlers.onLeave).toHaveBeenCalledTimes(1);
  });

  test('an owner viewer cannot leave', async () => {
    await renderSection({ viewerUserId: 'user-owner' });
    await expect.element(page.getByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
  });

  test('without manage rights no one can be removed', async () => {
    await renderSection();
    await expect.element(page.getByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('combobox', { name: 'Role for Bob Builder' }))
      .not.toBeInTheDocument();
  });

  test('managers can remove other non-owner members only', async () => {
    await renderSection({ canManage: true });
    await expect.poll(() => page.getByRole('button', { name: 'Remove' }).elements().length).toBe(1);
    await page.getByRole('button', { name: 'Remove' }).click();
    expect(handlers.onRemove).toHaveBeenCalledWith('member-bob');
  });

  test('managers can change another member role', async () => {
    await renderSection({ canManage: true });
    await expect
      .poll(() => page.getByRole('combobox', { name: 'Role for Bob Builder' }).elements().length)
      .toBe(1);
    await page.getByRole('combobox', { name: 'Role for Bob Builder' }).click();
    await page.getByRole('option', { name: 'Member' }).click();
    expect(handlers.onRoleChange).toHaveBeenCalledWith('member-bob', 'member');
  });

  test('pending actions disable remove, leave, and role changes', async () => {
    await renderSection({ canManage: true, pendingAction: 'remove' });
    await expect.element(page.getByRole('button', { name: 'Remove' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Leave' })).toBeDisabled();
    await expect
      .element(page.getByRole('combobox', { name: 'Role for Bob Builder' }))
      .toBeDisabled();
  });
});

test('searches members by name, identity, or role and clears the filter', async () => {
  await renderSection();
  const search = page.getByRole('searchbox', { name: 'Search members' });
  await search.fill('OLIVE');
  await expect.poll(() => page.getByRole('article').elements().length).toBe(1);
  await expect.element(page.getByText('@olive')).toBeVisible();
  await search.fill('admin');
  await expect.element(page.getByText('Bob Builder').first()).toBeVisible();
  await search.fill('Nobody');
  await expect.element(page.getByRole('status')).toHaveTextContent('No members match your search.');
  await page.getByRole('button', { name: 'Clear member filters' }).click();
  await expect.poll(() => page.getByRole('article').elements().length).toBe(3);
});

test('keeps phone member rows uniform and management actions usable', async () => {
  await useViewport(390, 844);
  await renderSection({ canManage: true });
  const rows = page.getByRole('article').elements();
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  expect(rows[1]?.getBoundingClientRect().height).toBe(rows[2]?.getBoundingClientRect().height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
  await expect.element(page.getByRole('combobox', { name: 'Role for Bob Builder' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  expect(handlers.onRemove).toHaveBeenCalledWith('member-bob');
});

test('sorts members by name and restores group order', async () => {
  await renderSection();
  await page.getByLabelText('Sort members').click();
  await page.getByRole('option', { name: 'Name A–Z' }).click();
  expect(page.getByRole('article').elements()[0]?.textContent).toContain('Bob Builder');
  await page.getByLabelText('Sort members').click();
  await page.getByRole('option', { name: 'Group order' }).click();
  expect(page.getByRole('article').elements()[0]?.textContent).toContain('Olive Owner');
});
