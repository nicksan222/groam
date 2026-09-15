import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type ReviewIdeaChangeInput = {
  comment: string;
  change: string;
};

export async function reviewIdeaChange(
  target: UiTarget,
  input: ReviewIdeaChangeInput
): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.ideaSectionCompare));
  const change = by(user.page, ids.compareSharedTrip)
    .getByRole('article')
    .filter({ hasText: input.change });
  await expect(change.getByText(input.change, { exact: true })).toBeVisible();
  await user.click(change.getByRole('button', { name: /^Collapse /u }));
  await expect(change.getByText(input.change, { exact: true })).toBeHidden();
  await user.click(change.getByRole('button', { name: /^Expand /u }));
  await user.click(change.getByRole('button', { name: /^Comment on /u }));
  await user.type(change.getByRole('textbox'), input.comment);
  await user.click(change.getByRole('button', { name: 'Add comment' }));
  await expect(change.getByRole('textbox')).toHaveCount(0);
  await expect(change.getByText(input.comment, { exact: false })).toBeVisible();
}
