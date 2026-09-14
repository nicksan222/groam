import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openBackgroundActivity(target: UiTarget): Promise<'empty' | 'run'> {
  const user = ui(target);
  await user.click(by(user.page, ids.navSettings));
  await user.click(by(user.page, ids.settingsSectionAi));
  await user.click(user.page.getByRole('link', { name: 'Background activity' }));
  await expect(by(user.page, ids.agentsTitle)).toHaveText('Background activity');
  await user.page.locator('[data-slot="skeleton"]').first().waitFor({ state: 'hidden' });
  const run = user.page.getByTestId(ids.agentRunFeedRunCell).getByRole('link').first();
  if (!(await run.count())) return 'empty';
  await user.click(run);
  await expect(by(user.page, ids.agentRunDetail)).toBeVisible();
  return 'run';
}
