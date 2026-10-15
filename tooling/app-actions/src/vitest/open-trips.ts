import { expect } from 'vite-plus/test';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, tripCard } from './locators';
import { expectPath, idFromPath, tap } from './queries';

export type TripSection = 'activity' | 'ideas' | 'issues' | 'itinerary' | 'overview';

export async function openTrips(): Promise<void> {
  await tap(by(ids.navTrips));
  await expect.element(by(ids.tripsTitle)).toBeVisible();
}

export async function openTripFromList(tripName: string): Promise<void> {
  await openTrips();
  await tap(tripCard(tripName));
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', tripName);
}

/**
 * Opens a shared trip directly, typically one arranged through the backend, and returns the
 * short id the app canonicalizes its URL to.
 */
export async function openTrip(tripId: string): Promise<string> {
  await openAppPath(`trips/${tripId}`);
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expectPath(/\/trips\/[a-z]{6}(?:[/?#]|$)/u);
  return idFromPath('trips');
}

export async function openTripSection(section: TripSection): Promise<void> {
  const sectionIds = {
    activity: ids.tripSectionActivity,
    ideas: ids.tripSectionIdeas,
    issues: ids.tripSectionIssues,
    itinerary: ids.tripSectionItinerary,
    overview: ids.tripSectionOverview
  } as const;
  await tap(by(sectionIds[section]));
}

export async function openSharedTrip(): Promise<void> {
  await tap(by(ids.ideaOpenShared));
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expectPath(/\/trips\/[a-z]{6}(?:[/?#]|$)/u);
}
