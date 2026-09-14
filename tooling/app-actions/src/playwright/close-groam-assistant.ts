import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function closeGroamAssistant(target: UiTarget): Promise<void> {
  const user = ui(target);
  const menu = user.page.getByRole('menu');
  if (await menu.isVisible()) {
    await user.page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }
  const panel = user.page.getByRole('region', { name: 'Groam AI', exact: true });
  if (!(await panel.isVisible())) return;
  await user.click(panel.getByRole('button', { name: 'Close AI assistant', exact: true }));
  await expect(panel).toBeHidden();
}
