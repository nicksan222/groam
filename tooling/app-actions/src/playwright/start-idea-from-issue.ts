import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function startIdeaFromIssue(target: UiTarget): Promise<string> {
  const user = ui(target);
  await user.click(by(user.page, ids.issueEditIdea));
  await user.click(by(user.page, ids.issueStartIdea));
  const workspace = by(user.page, ids.ideaWorkspace);
  await expect(workspace).toBeVisible({ timeout: 20_000 });
  await expect(workspace).toHaveAttribute('data-idea-name', /.+/u);
  const name = await workspace.getAttribute('data-idea-name');
  if (!name) throw new Error('Expected the issue-linked idea to expose its name');
  return name;
}
