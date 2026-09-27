import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';
import { openWorkspaceIdeas } from './open-workspace-ideas';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function startWorkspaceIdea(
  target: UiTarget,
  input: { tripName: string; title: string }
): Promise<void> {
  const user = ui(target);
  await openWorkspaceIdeas(user);
  const startButton = by(user.page, ids.startIdea);
  await user.click(
    (await startButton.isVisible())
      ? startButton
      : user.page.getByRole('button', { name: 'Start an idea' })
  );
  const dialog = by(user.page, ids.startIdeaDialog);
  await expect(dialog).toBeVisible();
  await user.click(dialog.getByRole('combobox', { name: 'Trip' }));
  await user.click(user.page.getByRole('option', { name: input.tripName, exact: true }));
  await user.type(by(user.page, ids.startIdeaName), input.title);
  await user.click(user.page.getByTestId(`${ids.startIdeaDialog}-submit`));
  await expect(dialog).toBeHidden();
  await expect(by(user.page, ids.ideaWorkspace)).toBeVisible();
}
