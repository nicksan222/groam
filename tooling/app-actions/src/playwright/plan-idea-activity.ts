import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { inlineActivityEditor } from './locators';
import { setActivityDayRange } from './set-activity-day-range';

/** Exercise the optional day chooser, then edit directly in the day schedule. */
export async function startActivityPlan(target: UiTarget, day?: number): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Add a plan', exact: true }));
  await user.click(user.page.getByRole('menuitem', { name: 'Activity', exact: true }));
  if (day !== undefined) {
    await user.click(
      user.page.getByRole('dialog').getByRole('combobox', { name: 'Day', exact: true })
    );
    await user.click(user.page.getByRole('option', { name: `Day ${day}`, exact: true }));
  }
}

export async function continueActivityPlan(
  target: UiTarget,
  title: string,
  range?: { startDay: number; endDay: number }
): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('dialog').getByRole('button', { name: 'Continue' }));
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
