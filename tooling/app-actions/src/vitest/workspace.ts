import { expect } from 'vite-plus/test';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, homeTurnRow } from './locators';
import { tap } from './queries';

export async function expectHomeDashboard(): Promise<void> {
  await expect.element(by(ids.homeDashboard)).toBeVisible();
}

export async function recoverFromNotFound(): Promise<void> {
  await expect.element(by(ids.notFound)).toBeVisible();
  await tap(by(ids.notFoundHome));
}

/** Opens Home by URL and waits for it. */
export async function openHome(): Promise<void> {
  await openAppPath('');
  await expectHomeDashboard();
}

/** Opens an item from Home's "Your turn" list by its title, through the title link. */
export async function openFromHomeTurn(title: string): Promise<void> {
  const row = homeTurnRow(title);
  await expect.element(row).toBeVisible();
  await tap(row.getByRole('link', { name: title, exact: true }));
}
