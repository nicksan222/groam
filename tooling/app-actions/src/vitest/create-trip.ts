import { page } from 'vite-plus/test/browser';
import type { CreateTripInput } from '#src/actions/create-trip';
import { ids } from '#src/testing/ids';

export type CreateTripFormInput = CreateTripInput & { budget?: number; startDate?: string };

/** Fills the open create-trip dialog the way a traveler would, then submits it. */
export async function createTrip(input: CreateTripFormInput): Promise<void> {
  await page.getByTestId(ids.createTripName).fill(input.name);
  const details: [string, string | number | undefined][] = [
    [ids.createTripStartDate, input.startDate],
    [ids.createTripDuration, input.durationDays],
    [ids.createTripDateNotes, input.dateNotes],
    [ids.createTripBudget, input.budget]
  ];
  if (details.some(([, value]) => value !== undefined)) {
    await page.getByText(/add dates and budget/iu).click();
  }
  for (const [testId, value] of details) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- A traveler fills the fields one at a time.
    if (value !== undefined) await page.getByTestId(testId).fill(String(value));
  }
  await page.getByTestId(`${ids.createTripDialog}-submit`).click();
}
