import { expect } from 'vite-plus/test';
import { ids } from '#src/testing/ids';
import { by } from './locators';
import { tap } from './queries';

export async function expectHomeDashboard(): Promise<void> {
  await expect.element(by(ids.homeDashboard)).toBeVisible();
}

export async function recoverFromNotFound(): Promise<void> {
  await expect.element(by(ids.notFound)).toBeVisible();
  await tap(by(ids.notFoundHome));
}
