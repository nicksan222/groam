import { expect } from 'vite-plus/test';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, tripCard } from './locators';
import { expectPath, idFromPath, tap } from './queries';

/** The tabs of a shared trip, plus the itinerary tab of an idea's working copy. */
export type TripSection = 'activity' | 'board' | 'ideas' | 'issues' | 'itinerary' | 'overview';

/** A marker only that tab's page renders, so opening it can wait for it. */
const sectionPages: Partial<Record<TripSection, string>> = {
  activity: ids.tripHistoryPage,
  board: ids.tripBoardScroller,
  overview: ids.tripPlanPage
};

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

const sectionTabs = {
  activity: ids.tripSectionActivity,
  board: ids.tripSectionBoard,
  ideas: ids.tripSectionIdeas,
  issues: ids.tripSectionIssues,
  itinerary: ids.tripSectionItinerary,
  overview: ids.tripSectionOverview
} as const;

/** Clicks a trip tab and, for the shared trip's tabs, waits for that tab's page. */
export async function openTripSection(section: TripSection): Promise<void> {
  await tap(by(sectionTabs[section]));
  const page = sectionPages[section];
  // The idea working copy's overview tab has no shared-trip page behind it.
  if (page && !(section === 'overview' && by(ids.tripSectionItinerary).query())) {
    await expect.element(by(page)).toBeVisible();
  }
}

export async function openSharedTrip(): Promise<void> {
  await tap(by(ids.ideaOpenShared));
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expectPath(/\/trips\/[a-z]{6}(?:[/?#]|$)/u);
}
