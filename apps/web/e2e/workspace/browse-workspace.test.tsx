import {
  by,
  expectHomeDashboard,
  expectPath,
  ids,
  openAppPath,
  openChatInbox,
  openIssuesInbox,
  openSettingsGroupSection,
  recoverFromNotFound
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/testing/open-app';

// The system-theme/mobile-navigation and mobile list-row tests are layout checks of single
// components and are left to view tests. Console errors are now caught for every journey.
test('group people live in settings, not the sidebar', async () => {
  await openApp();
  await expect.poll(() => page.getByRole('link', { name: 'Group' }).elements().length).toBe(0);
  await openSettingsGroupSection();
  await expect.element(by(ids.inviteMember)).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Invitation codes' })).toBeVisible();

  await openAppPath('group');
  await expectPath(/\/settings\/group\/?$/u);
  await expect.element(by(ids.inviteMember)).toBeVisible();

  await openAppPath('group/members');
  await expectPath(/\/settings\/group\/?$/u);
});

test('workspace routes and 404 recovery work', async () => {
  await openApp();

  await expect.element(by(ids.tripsTitle)).toBeVisible();
  await openIssuesInbox();
  await openChatInbox();

  await openAppPath('does-not-exist');
  await recoverFromNotFound();
  await expectHomeDashboard();
});
