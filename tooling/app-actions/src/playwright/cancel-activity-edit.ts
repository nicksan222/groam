import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { openActivityPlan } from './plan-idea-activity';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function discardActivityChanges(
  target: UiTarget,
  title: string,
  unsavedAddress: string
): Promise<void> {
  const user = ui(target);
  await openActivityPlan(user, title);
  const editor = user.page.getByRole('dialog');
  await user.type(editor.getByTestId(ids.activityAddress), unsavedAddress);
  await user.click(editor.getByRole('button', { name: 'Cancel' }));
  await expect(editor).toBeHidden();
}

export async function keepActivityPlan(target: UiTarget, title: string): Promise<void> {
  const user = ui(target);
  await openActivityPlan(user, title);
  const editor = user.page.getByRole('dialog');
  await user.click(editor.getByRole('button', { name: `Remove ${title}` }));
  await expect(editor.getByRole('button', { name: 'Remove plan' })).toBeVisible();
  await user.click(editor.getByRole('button', { name: 'Keep plan' }));
  await user.click(editor.getByRole('button', { name: 'Cancel' }));
  await expect(editor).toBeHidden();
}
