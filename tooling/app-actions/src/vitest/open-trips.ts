import { expect } from 'vite-plus/test';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, named, tripCard } from './locators';
import { expectPath, idFromPath, tap } from './queries';

/** The sections of a shared trip, plus the views of an idea's working copy (calendar, itinerary, overview). */
export type TripSection =
  | 'activity'
  | 'calendar'
  | 'ideas'
  | 'issues'
  | 'polls'
  | 'itinerary'
  | 'map'
  | 'overview'
  | 'packing'
  | 'people'
  | 'plan'
  | 'research';

/** A marker only that section's page renders, so opening it can wait for it. */
const sectionPages: Partial<Record<TripSection, () => ReturnType<typeof by>>> = {
  activity: () => by(ids.tripHistoryPage),
  calendar: () => by(ids.tripCalendarPage),
  map: () => by(ids.tripMapPage),
  // The three queues share one panel, so the marker names the section it shows.
  ideas: () => named(ids.queuePanel, 'data-section', 'ideas'),
  issues: () => named(ids.queuePanel, 'data-section', 'issues'),
  // An idea working copy's own overview tab; a shared trip's plan is `plan`.
  overview: () => by(ids.tripPlanPage),
  packing: () => by(ids.tripPackingPanel),
  people: () => by(ids.tripPeoplePanel),
  plan: () => by(ids.tripPlanPage),
  polls: () => named(ids.queuePanel, 'data-section', 'polls')
};

/** Opens the sidebar's trip switcher menu. */
export async function openTripSwitcher(): Promise<void> {
  await tap(by(ids.tripSwitcher));
  await expect.element(by(ids.navTrips)).toBeVisible();
}

/** Opens the trip list through the switcher's "All trips". */
export async function openTrips(): Promise<void> {
  await openTripSwitcher();
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

/** A section's row in the workspace sidebar. */
const sidebarSection = (section: TripSection) =>
  named(ids.sidebarTripSection, 'data-section', section);

/** The view tabs of an idea's working copy. */
const ideaTabs: Partial<Record<TripSection, string>> = {
  calendar: ids.tripSectionCalendar,
  itinerary: ids.tripSectionItinerary,
  overview: ids.tripSectionOverview,
  packing: ids.tripSectionPacking
};

const onIdeaPage = () => /\/ideas\/[^/]+/u.test(location.pathname);

/**
 * Opens a trip section. On a shared trip that is a sidebar row; on an idea's working copy (and for
 * the planning-only itinerary) it is the idea's own tab. Then it waits for the shared tab's page.
 */
export async function openTripSection(section: TripSection): Promise<void> {
  const ideaTab = ideaTabs[section];
  const inIdea = section === 'itinerary' || (ideaTab !== undefined && onIdeaPage());
  if (inIdea && !ideaTab) throw new Error(`The ${section} section is not available here`);
  await tap(inIdea && ideaTab ? by(ideaTab) : sidebarSection(section));
  const page = sectionPages[section];
  if (page) await expect.element(page()).toBeVisible();
}

export async function openSharedTrip(): Promise<void> {
  await tap(by(ids.tripActions));
  await tap(by(ids.ideaOpenShared));
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expectPath(/\/trips\/[a-z]{6}(?:[/?#]|$)/u);
}
