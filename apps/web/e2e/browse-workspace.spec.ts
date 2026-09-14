import {
  addIdea,
  by,
  createIssue,
  createTrip,
  expectHomeDashboard,
  ids,
  openAppPath,
  openChatInbox,
  openFirstMobileListRow,
  openIssuesInbox,
  openMobileChat,
  openSettingsGroupSection,
  openSharedTrip,
  recoverFromNotFound,
  selectSystemTheme,
  signIn,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('group people live in settings, not the sidebar', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('link', { name: 'Group', exact: true })).toHaveCount(0);
  await openSettingsGroupSection(page);
  await expect(by(page, ids.inviteMember)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Invitations' })).toBeVisible();

  await openAppPath(page, 'group');
  await expect(page).toHaveURL(/\/settings\/group\/?$/u);
  await expect(by(page, ids.inviteMember)).toBeVisible();

  await openAppPath(page, 'group/members');
  await expect(page).toHaveURL(/\/settings\/group\/?$/u);
});

test('workspace routes and 404 recovery work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await signIn(page);

  await expect(by(page, ids.tripsTitle)).toBeVisible();
  await openIssuesInbox(page);
  await openChatInbox(page);

  await openAppPath(page, 'does-not-exist');
  await recoverFromNotFound(page);
  await expectHomeDashboard(page);
  expect(errors).toEqual([]);
});

test('system theme and mobile navigation work', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.removeItem('groam-theme'));
  await signIn(page);
  await expect(page.locator('html')).toHaveClass(/dark/u);

  const navigation = by(page, ids.mobileNav);
  await expect(navigation).toBeVisible();
  await openMobileChat(page);
  await selectSystemTheme(page);
});

test('mobile idea and issue lists keep titles readable and rows navigable', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const suffix = uniqueSuffix();
  const tripId = await createTrip(page, { name: `Mobile lists ${suffix}` });
  await addIdea(page, { name: `Mobile idea ${suffix}` });
  await openSharedTrip(page);
  await createIssue(page, {
    body: 'Keep this issue title readable on a narrow screen.',
    title: `Mobile issue ${suffix}`,
    tripId
  });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const area of ['ideas', 'issues'] as const) {
    await openAppPath(page, area);
    await openFirstMobileListRow(page, area);
    await expect(page).toHaveURL(area === 'ideas' ? /\/ideas\/.+/u : /\/issues\/.+/u);
    await expect(by(page, ids.mobileNav)).toBeVisible();
  }
});
