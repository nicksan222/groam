import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';
import { ideaRow } from './locators';
import { openWorkspaceIdeas } from './open-workspace-ideas';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function filterWorkspaceIdeas(
  target: UiTarget,
  status: 'Open' | 'Settled',
  titles: readonly string[]
): Promise<void> {
  const user = ui(target);
  await openWorkspaceIdeas(user);
  await user.click(user.page.getByLabel('Filter ideas by status'));
  await user.click(user.page.getByRole('option', { name: status, exact: true }));
  for (const title of titles) {
    const row = ideaRow(user.page, title);
    await expect(row).toBeVisible();
    await user.point(row);
  }
}
