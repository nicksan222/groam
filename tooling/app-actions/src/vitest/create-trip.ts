import { page } from 'vite-plus/test/browser';
import type { CreateTripInput } from '#src/actions/create-trip';
import { ids } from '#src/testing/ids';
import { chooseDate } from './date-picker';
import { by, dialogSubmit } from './locators';
import { enter, tap } from './queries';

export type CreateTripFormInput = CreateTripInput & { budget?: number; startDate?: string };

/** Fills the open create-trip dialog the way a traveler would, then submits it. */
export async function fillCreateTripDialog(input: CreateTripFormInput): Promise<void> {
  await enter(by(ids.createTripName), input.name);
  const details = [input.startDate, input.durationDays, input.dateNotes, input.budget];
  if (details.some((value) => value !== undefined)) {
    await tap(page.getByText(/add dates and budget/iu));
  }
  if (input.startDate !== undefined) await chooseDate(by(ids.createTripStartDate), input.startDate);
  if (input.durationDays !== undefined) {
    await enter(by(ids.createTripDuration), String(input.durationDays));
  }
  if (input.dateNotes !== undefined) await enter(by(ids.createTripDateNotes), input.dateNotes);
  if (input.budget !== undefined) await enter(by(ids.createTripBudget), String(input.budget));
  await tap(dialogSubmit(ids.createTripDialog));
}
