import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { CreateTripInput } from '#src/actions/create-trip';
import type { UpdateTripInput } from '#src/actions/update-trip';
import { ids } from '#src/testing/ids';
import { by, dialogSubmit, named } from './locators';
import { idFromPath, isVisible, tap, enter } from './queries';

/** Creates a trip from the trip list the way a traveler does, and returns its short id. */
export async function createTripFromTrips(input: CreateTripInput): Promise<string> {
  await tap(by(ids.navTrips));
  await expect.element(by(ids.tripsTitle)).toBeVisible();
  const emptyState = by(ids.createTripEmpty);
  // Wait for the list to load; opening the dialog earlier loses it when the list re-renders.
  await expect.element(emptyState.or(by(ids.tripCard)).first()).toBeVisible();
  await tap(isVisible(emptyState) ? emptyState : by(ids.createTrip));
  await expect.element(by(ids.createTripDialog)).toBeVisible();
  await enter(by(ids.createTripName), input.name);
  if (input.dateNotes || input.durationDays) await tap(page.getByText(/add dates and budget/iu));
  if (input.dateNotes) await enter(by(ids.createTripDateNotes), input.dateNotes);
  if (input.durationDays) await enter(by(ids.createTripDuration), String(input.durationDays));
  await tap(dialogSubmit(ids.createTripDialog));
  await expect.element(by(ids.createTripDialog)).not.toBeInTheDocument();
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', input.name);
  return idFromPath('trips');
}

export async function archiveTrip(): Promise<void> {
  await tap(by(ids.tripArchive));
  await tap(page.getByRole('alertdialog').getByRole('button', { name: 'Continue' }));
  await tap(by(ids.tripActions));
  await expect.element(by(ids.tripActionRestore)).toBeVisible();
}

export async function restoreTrip(): Promise<void> {
  const restore = by(ids.tripActionRestore);
  if (!isVisible(restore)) await tap(by(ids.tripActions));
  await tap(restore);
  await expect.element(by(ids.tripArchive)).toBeVisible();
}

export type TripStatusFilter = 'active' | 'all' | 'archived';

export async function filterTripsByStatus(status: TripStatusFilter): Promise<void> {
  await tap(by(ids.tripStatusFilter));
  await tap(named(ids.tripStatusOption, 'data-status', status));
}

/** Edits the open trip (or idea working copy) through its edit dialog. */
export async function updateTrip(input: UpdateTripInput): Promise<void> {
  const edit = by(ids.tripActionEdit);
  if (!isVisible(edit)) await tap(by(ids.tripActions));
  await tap(edit);
  if (input.name !== undefined) await enter(by(ids.createTripName), input.name);
  if (input.dateNotes !== undefined) await enter(by(ids.editTripDateNotes), input.dateNotes);
  if (input.durationDays !== undefined) {
    await enter(by(ids.createTripDuration), String(input.durationDays));
  }
  if (input.budgetAmount !== undefined) {
    await enter(by(ids.editTripBudget), String(input.budgetAmount));
  }
  await tap(by(ids.editTripSave));
  await expect.element(by(ids.editTripDialog)).not.toBeInTheDocument();
}
