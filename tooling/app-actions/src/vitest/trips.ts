import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { CreateTripInput } from '#src/actions/create-trip';
import type { UpdateTripInput } from '#src/actions/update-trip';
import { ids } from '#src/testing/ids';
import { fillCreateTripDialog } from './create-trip';
import { by, named } from './locators';
import { expectGone, idFromPath, tap, enter } from './queries';

/**
 * Creates a trip from the trip list the way a traveler does, and returns its short id. The caller
 * states whether the list is `empty` (a first-trip prompt) or `populated`; both wait for the list
 * to load first, since a dialog opened earlier is lost when the list re-renders.
 */
export async function createTripFromTrips(
  input: CreateTripInput,
  list: 'empty' | 'populated'
): Promise<string> {
  await tap(by(ids.navTrips));
  await expect.element(by(ids.tripsTitle)).toBeVisible();
  if (list === 'empty') {
    await tap(by(ids.createTripEmpty));
  } else {
    await expect.element(by(ids.tripCard).first()).toBeVisible();
    await tap(by(ids.createTrip));
  }
  await expect.element(by(ids.createTripDialog)).toBeVisible();
  await fillCreateTripDialog(input);
  await expectGone(by(ids.createTripDialog));
  await expect.element(by(ids.tripHeading)).toHaveAttribute('data-trip-name', input.name);
  return idFromPath('trips');
}

async function expectTripAction(id: string): Promise<void> {
  await tap(by(ids.tripActions));
  await expect.element(by(id)).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expectGone(by(id));
}

export async function archiveTrip(): Promise<void> {
  await tap(by(ids.tripActions));
  await tap(by(ids.tripArchive));
  await tap(page.getByRole('alertdialog').getByRole('button', { name: 'Continue' }));
  await expectTripAction(ids.tripActionRestore);
}

export async function restoreTrip(): Promise<void> {
  await tap(by(ids.tripActions));
  await tap(by(ids.tripActionRestore));
  await expectTripAction(ids.tripArchive);
}

export type TripStatusFilter = 'active' | 'all' | 'archived';

export async function filterTripsByStatus(status: TripStatusFilter): Promise<void> {
  await tap(by(ids.tripStatusFilter));
  await tap(named(ids.tripStatusOption, 'data-status', status));
}

/** Edits the open idea's working copy through its edit dialog. */
export async function updateTrip(input: UpdateTripInput): Promise<void> {
  await tap(by(ids.tripActionEdit));
  if (input.name !== undefined) await enter(by(ids.createTripName), input.name);
  if (input.dateNotes !== undefined) await enter(by(ids.editTripDateNotes), input.dateNotes);
  if (input.durationDays !== undefined) {
    await enter(by(ids.createTripDuration), String(input.durationDays));
  }
  if (input.budgetAmount !== undefined) {
    await enter(by(ids.editTripBudget), String(input.budgetAmount));
  }
  await tap(by(ids.editTripSave));
  await expectGone(by(ids.editTripDialog));
}

export type TravelerRsvp = 'going' | 'maybe' | 'not_going';

const rsvpLabels: Record<TravelerRsvp, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: 'Not going'
};

/** Sets the viewer's own RSVP from the open trip's traveler chip, then closes the roster again. */
export async function setMyTripRsvp(status: TravelerRsvp): Promise<void> {
  await tap(page.getByRole('button', { name: /^\d+ travelers?$/u }));
  const roster = by(ids.tripTravelers);
  await expect.element(roster).toBeVisible();
  const rsvp = roster.getByRole('combobox', { name: 'Your RSVP' });
  await tap(rsvp);
  await tap(page.getByRole('option', { name: rsvpLabels[status], exact: true }));
  await expect.element(rsvp).toHaveTextContent(rsvpLabels[status]);
  await userEvent.keyboard('{Escape}');
  await expectGone(roster);
}
