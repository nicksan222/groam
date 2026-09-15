import { expect as playwrightExpect } from '@playwright/test';
import type { AddActivityAction } from '#src/actions/add-activity';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const addActivity: AddActivityAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Add a plan', exact: true }));
  await user.click(user.page.getByRole('menuitem', { name: 'Activity', exact: true }));
  const chooser = user.page.getByRole('combobox', { name: 'Destination', exact: true });
  await expect(user.page.getByRole('dialog')).toBeVisible();
  if (await chooser.isVisible()) {
    await user.click(chooser);
    await user.click(user.page.getByRole('option', { name: input.destination, exact: true }));
    await user.click(user.page.getByRole('button', { name: 'Continue', exact: true }));
  }
  const panel = user.page.getByRole('dialog');
  await user.type(panel.getByTestId(ids.activityTitle), input.title);
  if (input.address) await user.type(panel.getByTestId(ids.activityAddress), input.address);
  if (input.notes) await user.type(panel.getByTestId(ids.activityNotes), input.notes);
  await user.click(panel.getByTestId(ids.activitySubmit));
  await expect(panel).toBeHidden();
  await expect(
    user.page.getByRole('button', { name: `Edit ${input.title}`, exact: true })
  ).toBeVisible();
};
