import type { Page } from '@playwright/test';
import { openTripSection } from './open-trip-section';

export async function openItinerary(page: Page): Promise<void> {
  await openTripSection(page, 'itinerary');
}
