import { render } from '@groam/vitest-config/react';
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
    await expect.element(page.getByText('Olive Owner')).toBeVisible();
    await expect.element(page.getByText('@olive')).toBeVisible();
    await expect.element(page.getByText('Mia Member (you)')).toBeVisible();
    await expect.element(page.getByText('Bob Builder').first()).toBeVisible();
    await expect.element(page.getByText('owner', { exact: true })).toBeVisible();
  });

  test('shows an empty table without members', async () => {
    await renderSection({ organization: makeOrganization([]) });
    await expect.element(page.getByText('Olive Owner')).not.toBeInTheDocument();
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
    await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  });

  test('managers can remove other non-owner members only', async () => {
    await renderSection({ canManage: true });
    await expect.poll(() => page.getByRole('button', { name: 'Remove' }).elements().length).toBe(1);
    await page.getByRole('button', { name: 'Remove' }).click();
    expect(handlers.onRemove).toHaveBeenCalledWith('member-bob');
  });

  test('managers can change another member role', async () => {
    await renderSection({ canManage: true });
    await expect.poll(() => page.getByRole('combobox').elements().length).toBe(1);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Member' }).click();
    expect(handlers.onRoleChange).toHaveBeenCalledWith('member-bob', 'member');
  });

  test('pending actions disable remove, leave, and role changes', async () => {
    await renderSection({ canManage: true, pendingAction: 'remove' });
    await expect.element(page.getByRole('button', { name: 'Remove' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Leave' })).toBeDisabled();
    await expect.element(page.getByRole('combobox')).toBeDisabled();
  });
});
