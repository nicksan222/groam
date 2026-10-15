import { expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { type UiTarget, ui } from './interaction';
import { inlineActivityEditor } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function setActivityDayRange(
  target: UiTarget,
  startDay: number,
  endDay: number
): Promise<void> {
  const user = ui(target);
  const editor = inlineActivityEditor(user.page);
  const days = editor.getByTestId(ids.dayRangeDays);
  const start = days.locator(`[data-day="${startDay}"]`);
  const end = days.locator(`[data-day="${endDay}"]`);
  // New inline activities keep their dates under "More options".
  if (!(await start.isVisible())) await user.click(editor.getByTestId(ids.activityMoreOptions));
  // Clicking the selected start day anchors a new range without clearing it.
  await user.click(start);
  if (startDay !== endDay) await user.click(end);
  await expect(start).toHaveAttribute('aria-pressed', 'true');
  await expect(end).toHaveAttribute('aria-pressed', 'true');
}
