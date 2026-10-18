import type { Page } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { by } from './locators';

export function createTripButton(page: Page) {
  return by(page, ids.createTrip);
}
