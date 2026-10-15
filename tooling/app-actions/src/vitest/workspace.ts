import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, css } from './locators';
import { expectGone, expectPath, tap } from './queries';

export async function expectHomeDashboard(): Promise<void> {
  await expect.element(by(ids.homeDashboard)).toBeVisible();
}

export async function recoverFromNotFound(): Promise<void> {
  await expect.element(by(ids.notFound)).toBeVisible();
  await tap(by(ids.notFoundHome));
}

export async function openMobileChat(): Promise<void> {
  await tap(by(ids.mobileNavChat));
  await expect.element(by(ids.chatsTitle)).toBeVisible();
}

export async function selectSystemTheme(): Promise<void> {
  await tap(by(ids.mobileNavMore));
  await tap(by(ids.navSettings));
  await tap(by(ids.settingsSectionAppearance));
  await tap(by(ids.themeSystem));
}

export type MobileWorkspaceList = 'ideas' | 'issues';

/** Checks the first list row keeps its title readable on a narrow screen, then opens it. */
export async function openFirstMobileListRow(area: MobileWorkspaceList): Promise<void> {
  const row = css('tbody tr')
    .filter({ has: css(area === 'ideas' ? 'h4' : 'a[title]') })
    .first();
  await expect.element(row).toBeVisible();
  const title = css('td', row).first();
  await expect.poll(() => title.element().getBoundingClientRect().width).toBeGreaterThan(200);
  await expect
    .poll(
      () =>
        [...row.element().querySelectorAll('td')].filter((cell) =>
          cell.checkVisibility({ visibilityProperty: true })
        ).length
    )
    .toBe(2);
  await expectGone(page.getByRole('button', { name: 'Columns' }));
  await tap(title);
  await expectPath(area === 'ideas' ? /\/ideas\/.+/u : /\/issues\/.+/u);
}
