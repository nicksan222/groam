import type { Page } from '@playwright/test';
import { appHref } from './app-href';

export async function openAppPath(page: Page, path: string): Promise<void> {
  const target = URL.canParse(path) ? new URL(path) : undefined;
  await page.goto(target ? `${target.pathname}${target.search}${target.hash}` : appHref(path));
}

export async function reloadAppPage(page: Page): Promise<void> {
  await page.reload();
}
