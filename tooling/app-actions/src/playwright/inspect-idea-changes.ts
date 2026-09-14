import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, ideaRow } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function inspectIdeaChanges(
  target: UiTarget,
  ideaName: string,
  changes: readonly string[]
): Promise<void> {
  const user = ui(target);
  const row = ideaRow(user.page, ideaName);
  if (await row.isVisible()) await user.click(row.getByTestId(ids.ideaView));
  await user.click(by(user.page, ids.ideaSectionCompare));
  for (const change of changes) {
    const detail = user.page.getByText(change, { exact: true }).first();
    await expect(detail).toBeVisible();
    await user.point(detail);
  }
  await expect(by(user.page, ids.approveIdea).first()).toBeEnabled();
}
