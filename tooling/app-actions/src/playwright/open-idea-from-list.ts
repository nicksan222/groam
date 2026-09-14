import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { ideaRow } from './locators';
import { openWorkspaceIdeas } from './open-workspace-ideas';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openIdeaFromList(target: UiTarget, ideaName: string): Promise<void> {
  const user = ui(target);
  await openWorkspaceIdeas(user);
  const row = ideaRow(user.page, ideaName);
  const continueDraft = row.getByTestId(ids.ideaContinue);
  await user.click(
    (await continueDraft.isVisible()) ? continueDraft : row.getByTestId(ids.ideaView)
  );
  await expect(user.page).toHaveURL(/\/(?:trips\/[^/]+\/)?ideas\/[^/?]+/u);
}
