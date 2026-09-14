import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function setTripDates(target: UiTarget, start: string, end: string): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.tripSectionOverview));
  await user.click(by(user.page, ids.tripDatesStart));
  for (let attempt = 0; attempt < 3; attempt++) {
    const selected = user.page.locator('button[data-range-start="true"]').first();
    if (!(await selected.isVisible())) break;
    await selected.click();
  }
  for (const date of [start, end]) {
    const key = await user.page.evaluate(
      (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(),
      date
    );
    const day = user.page.locator(`button[data-day="${key}"]`).first();
    for (let month = 0; !(await day.isVisible()) && month < 120; month++) {
      const first = await user.page.locator('button[data-day]').first().getAttribute('data-day');
      if (!first) throw new Error('Calendar has no days');
      const [dayNumber, monthNumber, year] = first.split('/').map(Number);
      const visibleMonth = `${year}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      await user.click(
        user.page.getByRole('button', {
          name: date < visibleMonth ? 'Go to the Previous Month' : 'Go to the Next Month'
        })
      );
    }
    await user.click(day);
  }
  await user.click(by(user.page, ids.tripDatesSave));
  await expect(by(user.page, ids.tripDatesSave)).toHaveText('Saved');
  const format = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(iso));
  await expect(by(user.page, ids.tripDatesStart)).toContainText(format(start));
  await expect(by(user.page, ids.tripDatesEnd)).toContainText(format(end));
}
