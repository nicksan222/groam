import { expect as playwrightExpect } from '@playwright/test';
import type { AddActivityAction } from '#src/actions/add-activity';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { inlineActivityEditor } from '#src/playwright/locators';
import { openTripSection } from '#src/playwright/open-trip-section';
import { ids } from '#src/testing/ids';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const addActivity: AddActivityAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await openTripSection(target, 'itinerary');
  // Plan the activity on the first day that hosts the destination.
  const day = user.page
    .getByRole('region', { name: /^Day \d+ schedule$/u })
    .filter({
      has: user.page.getByRole('button', {
        name: new RegExp(`^Manage ${escapeRegExp(input.destination)} for Day \\d+$`, 'u')
      })
    })
    .first();
  await user.click(day.getByRole('button', { name: 'Add to day' }));
  await user.click(user.page.getByRole('menuitem', { name: 'Activity', exact: true }));
  const panel = inlineActivityEditor(user.page);
  await user.type(panel.getByTestId(ids.activityTitle), input.title);
  if (input.address) await user.type(panel.getByTestId(ids.activityAddress), input.address);
  if (input.notes) {
    const notes = panel.getByTestId(ids.activityNotes);
    if (!(await notes.isVisible())) await user.click(panel.getByTestId(ids.activityMoreOptions));
    await user.type(notes, input.notes);
  }
  await user.click(panel.getByTestId(ids.activitySubmit));
  await expect(panel).toBeHidden();
  await expect(
    user.page.getByRole('button', { name: `Edit ${input.title}`, exact: true })
  ).toBeVisible();
};
