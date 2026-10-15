import { expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { type UiTarget, ui } from './interaction';
import { setActivityDayRange } from './set-activity-day-range';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type InlineActivityPeriod = 'morning' | 'afternoon' | 'evening';

const periodLabels = {
  afternoon: 'Afternoon',
  evening: 'Evening',
  morning: 'Morning'
} as const satisfies Record<InlineActivityPeriod, string>;

export async function addInlineActivity(
  target: UiTarget,
  input: {
    day: number;
    destination?: string;
    expectDayReset?: boolean;
    notes?: string;
    period: InlineActivityPeriod;
    range?: { startDay: number; endDay: number };
    title: string;
  }
): Promise<void> {
  const user = ui(target);
  const day = user.page.getByRole('region', { name: `Day ${input.day} schedule` });
  await user.click(day.getByRole('button', { name: 'Add to day' }));
  await user.click(user.page.getByRole('menuitem', { name: 'Activity', exact: true }));
  const form = day.getByTestId(ids.activityInlineEditor);
  await expect(form).toHaveAttribute('aria-label', `Add an activity to Day ${input.day}`);
  await user.type(form.getByTestId(ids.activityTitle), input.title);
  const period = form.getByRole('button', { name: periodLabels[input.period], exact: true });
  await user.click(period);
  await expect(period).toHaveAttribute('aria-pressed', 'true');
  if (input.range) {
    await user.click(form.getByTestId(ids.activityMoreOptions));
    await setActivityDayRange(user, input.range.startDay, input.range.endDay);
  }
  if (input.destination) {
    await user.click(form.getByRole('combobox', { name: 'Destination' }));
    await user.click(user.page.getByRole('option', { name: input.destination, exact: true }));
    await expect(form.getByTestId(ids.activityTitle)).toHaveValue(input.title);
    if (input.expectDayReset) {
      const days = form.getByTestId(ids.dayRangeDays);
      await expect(days.locator(`[data-day="${input.day}"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      if (input.range && input.range.startDay !== input.day) {
        await expect(days.locator(`[data-day="${input.range.startDay}"]`)).toHaveAttribute(
          'aria-pressed',
          'false'
        );
      }
    }
  }
  if (input.notes) {
    const notes = form.getByTestId(ids.activityNotes);
    if (!(await notes.isVisible())) await user.click(form.getByTestId(ids.activityMoreOptions));
    await user.type(notes, input.notes);
  }
  await user.click(form.getByTestId(ids.activitySubmit));
  await expect(form).toHaveCount(0);
  await expect(day.getByRole('button', { name: `Edit ${input.title}` })).toBeVisible();
}

export async function editInlineActivity(
  target: UiTarget,
  input: { address: string; day: number; period?: InlineActivityPeriod; title: string }
): Promise<void> {
  const user = ui(target);
  const day = user.page.getByRole('region', { name: `Day ${input.day} schedule` });
  await user.click(day.getByRole('button', { name: `Edit ${input.title}` }));
  const form = day.getByTestId(ids.activityInlineEditor);
  await expect(form).toHaveAttribute('aria-label', `Edit ${input.title}`);
  if (input.period) {
    await expect(
      form.getByRole('button', { name: periodLabels[input.period], exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
  }
  await user.type(form.getByTestId(ids.activityAddress), input.address);
  await user.click(form.getByTestId(ids.activitySubmit));
  await expect(form).toHaveCount(0);
}
