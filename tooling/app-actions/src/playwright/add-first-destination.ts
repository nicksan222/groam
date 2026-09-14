import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, destinationResult, dialogSubmit } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type AddFirstDestinationInput = {
  initialSearch?: string;
  name: string;
  notes: string;
};

export async function addFirstDestination(
  target: UiTarget,
  input: AddFirstDestinationInput
): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Add first destination', exact: true }));
  const composer = by(user.page, ids.addStopDialog);
  await expect(composer).toBeVisible();
  await user.click(composer.getByText('Destination', { exact: true }));
  const search = by(user.page, ids.destinationSearchInput);
  const submit = dialogSubmit(user.page, ids.addStopDialog);
  await expect(search).toBeFocused();
  await expect(submit).toBeDisabled();
  if (input.initialSearch) {
    await user.type(search, input.initialSearch);
    await user.click(destinationResult(user.page, `${input.initialSearch}, Portugal`));
    await expect(composer.getByRole('status')).toContainText(`${input.initialSearch}, Portugal`);
    await expect(submit).toBeEnabled();
  }
  await user.type(search, input.name);
  await expect(submit).toBeDisabled();
  await user.click(destinationResult(user.page, `${input.name}, Portugal`));
  await expect(submit).toBeEnabled();
  await user.type(by(user.page, ids.addStopPlans), input.notes);
  await user.click(submit);
  await expect(composer).toBeHidden();
}
