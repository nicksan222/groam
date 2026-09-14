import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { by, calendarDay } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function saveSevenDayRange(page: Page): Promise<void> {
  await expect(by(page, ids.tripDatesStart)).toBeEnabled();
  await by(page, ids.tripDatesStart).click();
  const days = calendarDay(page);
  await expect(days).not.toHaveCount(0);
  const startDay = days.nth(10);
  const startValue = await startDay.getAttribute('data-day');
  if (!startValue) throw new Error('Expected a selectable start day');
  const endDayValue = await days.evaluateAll((buttons, start) => {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return null;
    const target = new Date(startDate);
    target.setDate(startDate.getDate() + 6);
    const targetKey = target.toLocaleDateString();
    return buttons.map((day) => day.getAttribute('data-day')).find((value) => value === targetKey);
  }, startValue);
  if (!endDayValue) throw new Error('Expected a selectable seven-day calendar range');
  await startDay.click();
  const endDay = calendarDay(page, endDayValue).first();
  await expect(endDay).toBeEnabled();
  await endDay.click();
  await expect(by(page, ids.tripDatesSave)).toBeEnabled();
  await by(page, ids.tripDatesSave).click();
  await expect(by(page, ids.tripDatesSave)).toHaveText('Saved');
}
