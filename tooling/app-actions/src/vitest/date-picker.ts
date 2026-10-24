import { expect } from 'vite-plus/test';
import { type Locator, page } from 'vite-plus/test/browser';
import { calendarDay } from './locators';
import { tap } from './queries';

function localDate(isoDate: string): Date {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Pages the open calendar month by month toward `isoDate`, then picks that day. */
async function pickCalendarDay(isoDate: string, pagesLeft: number): Promise<void> {
  const target = calendarDay(localDate(isoDate).toLocaleDateString());
  if (target.elements().length > 0) return tap(target.first());
  if (pagesLeft === 0) throw new Error(`Could not reach ${isoDate} on the calendar`);
  // Days carry `toLocaleDateString()`, which the Vitest browser config pins to en-US.
  const shown = new Date(calendarDay().first().element().getAttribute('data-day') ?? '');
  const later = localDate(isoDate).getTime() > shown.getTime();
  await tap(page.getByRole('button', { name: later ? /next month/iu : /previous month/iu }));
  return pickCalendarDay(isoDate, pagesLeft - 1);
}

/** Opens a date picker and chooses a `YYYY-MM-DD` date on its calendar, paging months as needed. */
export async function chooseDate(trigger: Locator, isoDate: string): Promise<void> {
  await tap(trigger);
  await expect.poll(() => calendarDay().elements().length).toBeGreaterThan(0);
  await pickCalendarDay(isoDate, 120);
}
