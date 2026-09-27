import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function closeIdea(target: UiTarget, reason?: string): Promise<void> {
  const user = ui(target);
  const label = reason === undefined ? 'Delete draft' : 'Close without applying';
  await user.click(user.page.getByRole('button', { name: 'Idea actions' }));
  await user.click(user.page.getByRole('menuitem', { name: label }));
  const dialog = user.page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (reason !== undefined) {
    await expect(dialog.getByRole('button', { name: label })).toBeDisabled();
    await user.type(dialog.getByTestId(ids.closeIdeaReason), reason);
  }
  await user.click(dialog.getByRole('button', { name: label }));
  await expect(dialog).toBeHidden();
}
