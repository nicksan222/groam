import type { Page } from '@playwright/test';
import { expectTripsReady } from './expect-trips-ready';
import { openAppPath } from './open-app-path';

/** Opens the signed-in app on the trip list, where `signIn` used to land. */
export async function openApp(page: Page): Promise<void> {
  await openAppPath(page, 'trips');
  await expectTripsReady(page);
}
