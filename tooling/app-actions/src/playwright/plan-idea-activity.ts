import { ids } from '#src/testing/ids';
import { type UiTarget, ui } from './interaction';
import { inlineActivityEditor } from './locators';
import { setActivityDayRange } from './set-activity-day-range';

/** Open the inline activity editor from a day's "Add to day" menu (first plannable day by default). */
export async function startActivityPlan(target: UiTarget, day?: number): Promise<void> {
  const user = ui(target);
  const days = day
    ? [user.page.getByRole('region', { name: `Day ${day} schedule`, exact: true })]
    : await user.page.getByRole('region', { name: /^Day \d+ schedule$/u }).all();
  for (const scope of days) {
    await user.click(scope.getByRole('button', { name: 'Add to day' }));
    const activity = user.page.getByRole('menuitem', { name: 'Activity', exact: true });
    if (await activity.isEnabled()) {
      await user.click(activity);
      return;
    }
    await user.page.keyboard.press('Escape');
  }
  throw new Error('No itinerary day accepts an activity yet');
}

export async function continueActivityPlan(
  target: UiTarget,
  title: string,
  range?: { startDay: number; endDay: number }
): Promise<void> {
  const user = ui(target);
  if (range) await setActivityDayRange(user, range.startDay, range.endDay);
  const editor = inlineActivityEditor(user.page);
  await user.type(editor.getByTestId(ids.activityTitle), title);
  await user.click(editor.getByTestId(ids.activitySubmit));
}

export async function openActivityPlan(
  target: UiTarget,
  title: string,
  day?: number
): Promise<void> {
  const user = ui(target);
  const scope = day ? user.page.getByRole('region', { name: `Day ${day} schedule` }) : user.page;
  await user.click(scope.getByRole('button', { name: `Edit ${title}`, exact: true }));
}

export async function removeActivityPlan(target: UiTarget, title: string): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: `Remove ${title}`, exact: true }));
  await user.click(user.page.getByRole('button', { name: 'Remove plan', exact: true }));
}
