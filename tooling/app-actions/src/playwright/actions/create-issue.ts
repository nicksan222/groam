import { expect as playwrightExpect } from '@playwright/test';
import type { CreateIssueAction } from '#src/actions/create-issue';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by, dialogSubmit, idFromPath } from '#src/playwright/locators';
import { ids } from '#src/testing/ids';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const createIssue: CreateIssueAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await user.click(by(user.page, ids.newIssue));
  await expect(by(user.page, ids.createIssueDialog)).toBeVisible();
  await user.type(by(user.page, ids.createIssueTitle), input.title);
  await user.type(by(user.page, ids.createIssueBody), input.body);
  await user.click(dialogSubmit(user.page, ids.createIssueDialog));
  await expect(by(user.page, ids.createIssueDialog)).toBeHidden({ timeout: 20_000 });
  await expect(by(user.page, ids.issueHeading)).toHaveAttribute('data-issue-id', /.+/u);
  return idFromPath(user.page, 'issues');
};
