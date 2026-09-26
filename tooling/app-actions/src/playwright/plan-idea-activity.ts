import { ids } from './ids';
import { type UiTarget, ui } from './interaction';

/** Exercise the itinerary editor's day chooser and activity sheet. */
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

export async function continueActivityPlan(target: UiTarget, title: string): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('dialog').getByRole('button', { name: 'Continue' }));
  await user.type(user.page.getByRole('dialog').getByTestId(ids.activityTitle), title);
  await user.click(user.page.getByRole('dialog').getByTestId(ids.activitySubmit));
}

export async function openActivityPlan(target: UiTarget, title: string): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: `Edit ${title}`, exact: true }));
}

export async function removeActivityPlan(target: UiTarget, title: string): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: `Remove ${title}`, exact: true }));
  await user.click(user.page.getByRole('button', { name: 'Remove plan', exact: true }));
}
