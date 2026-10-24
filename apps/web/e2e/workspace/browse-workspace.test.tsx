import {
  by,
  expectGone,
  expectHomeDashboard,
  expectWorkspaceReady,
  ids,
  openAppPath,
  openChatInbox,
  openSettingsGroupSection,
  recoverFromNotFound
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openApp } from '@/journeys/open-app';

test('group people live in settings, not the sidebar', async () => {
  await openApp();
  await expectWorkspaceReady();
  await expectGone(page.getByRole('link', { name: 'Group' }));
  await openSettingsGroupSection();
  await expect.element(by(ids.inviteMember)).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Invitation codes' })).toBeVisible();
});

test('workspace routes and 404 recovery work', async () => {
  await openApp();

  await expect.element(by(ids.tripsTitle)).toBeVisible();
  await openChatInbox();

  await openAppPath('does-not-exist');
  await recoverFromNotFound();
  await expectHomeDashboard();
});
