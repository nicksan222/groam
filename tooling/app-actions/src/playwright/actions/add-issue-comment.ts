import { expect as playwrightExpect } from '@playwright/test';
import type { AddIssueCommentAction } from '#src/actions/add-issue-comment';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const addIssueComment: AddIssueCommentAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await user.type(by(user.page, ids.issueComment), input.content);
  await user.click(by(user.page, ids.issueCommentSubmit));
  await expect(user.page.getByText(input.content, { exact: true })).toBeVisible();
};
