import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';
import { assistantPanel } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openGroamAssistant(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Open Groam AI', exact: true }));
  const panel = assistantPanel(user.page);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('textbox', { name: 'Assistant prompt', exact: true })).toBeEnabled();
}
