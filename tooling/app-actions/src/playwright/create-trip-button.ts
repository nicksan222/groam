import type { Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export function createTripButton(page: Page) {
  return by(page, ids.createTrip);
}
