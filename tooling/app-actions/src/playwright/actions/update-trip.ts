import { expect as playwrightExpect } from '@playwright/test';
import type { UpdateTripAction } from '#src/actions/update-trip';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const updateTrip: UpdateTripAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const edit = by(user.page, ids.tripActionEdit);
  if (!(await edit.isVisible())) await user.click(by(user.page, ids.tripActions));
  await user.click(edit);
  if (input.name !== undefined) await user.type(by(user.page, ids.createTripName), input.name);
  if (input.dateNotes !== undefined) {
    await user.type(by(user.page, ids.editTripDateNotes), input.dateNotes);
  }
  if (input.durationDays !== undefined) {
    await user.type(by(user.page, ids.createTripDuration), String(input.durationDays));
  }
  if (input.budgetAmount !== undefined) {
    await user.type(by(user.page, ids.editTripBudget), String(input.budgetAmount));
  }
  await user.click(by(user.page, ids.editTripSave));
  await expect(by(user.page, ids.editTripDialog)).toBeHidden();
};
