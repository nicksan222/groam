import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type InlineActivityPeriod = 'morning' | 'afternoon' | 'evening';

export async function addInlineActivity(
  target: UiTarget,
  input: { day: number; destination?: string; period: InlineActivityPeriod; title: string }
): Promise<void> {
  const user = ui(target);
  const day = user.page.getByRole('region', { name: `Day ${input.day} schedule` });
  await user.click(
    day.getByRole('button', { name: `Add ${input.period} activity to Day ${input.day}` })
  );
  const form = day.getByTestId(ids.activityInlineEditor);
  await expect(form).toHaveAttribute('aria-label', `Add an activity to Day ${input.day}`);
  await user.type(form.getByTestId(ids.activityTitle), input.title);
  if (input.destination) {
    await user.click(form.getByRole('combobox', { name: 'Destination' }));
    await user.click(user.page.getByRole('option', { name: input.destination, exact: true }));
    await expect(form.getByTestId(ids.activityTitle)).toHaveValue(input.title);
  }
  await user.click(form.getByTestId(ids.activitySubmit));
  await expect(form).toHaveCount(0);
  await expect(day.getByRole('button', { name: `Edit ${input.title}` })).toBeVisible();
}

export async function editInlineActivity(
  target: UiTarget,
  input: { address: string; day: number; title: string }
): Promise<void> {
  const user = ui(target);
  const day = user.page.getByRole('region', { name: `Day ${input.day} schedule` });
  await user.click(day.getByRole('button', { name: `Edit ${input.title}` }));
  const form = day.getByTestId(ids.activityInlineEditor);
  await expect(form).toHaveAttribute('aria-label', `Edit ${input.title}`);
  await user.type(form.getByTestId(ids.activityAddress), input.address);
  await user.click(form.getByTestId(ids.activitySubmit));
  await expect(form).toHaveCount(0);
}
