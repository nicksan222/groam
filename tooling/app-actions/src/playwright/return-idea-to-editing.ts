import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function returnIdeaToEditing(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Idea actions' }));
  await user.click(user.page.getByRole('menuitem', { name: 'Back to editing' }));
  await expect(user.page).toHaveURL(/\/itinerary(?:\?.*)?$/u);
  await expect(user.page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
}
