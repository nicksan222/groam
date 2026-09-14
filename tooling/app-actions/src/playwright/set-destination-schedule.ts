import { type Locator, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function setDestinationSchedule(
  card: Locator,
  startDay: string,
  endDay: string
): Promise<void> {
  const days = card.getByTestId(ids.dayRangeDays);
  const start = days.locator(`[data-day="${startDay}"]`);
  const end = days.locator(`[data-day="${endDay}"]`);
  if (!(await start.isVisible())) {
    await card.getByLabel(/^Schedule & notes for /u).click();
  }
  await expect(start).toBeVisible();
  if (endDay === startDay) await start.click();
  else await start.dragTo(end);
  const save = card.getByTestId(ids.destinationSaveSchedule);
  if (await save.isEnabled()) await save.click();
  await expect(save).toHaveText('Saved', { timeout: 20_000 });
  await expect(start).toHaveAttribute('aria-pressed', 'true');
  await expect(end).toHaveAttribute('aria-pressed', 'true');
}
