import { expect as playwrightExpect } from '@playwright/test';
import type { SetIssueStatusAction } from '#src/actions/set-issue-status';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by, issueStatusSelectOption } from '#src/playwright/locators';
import { ids } from '#src/testing/ids';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const setIssueStatus: SetIssueStatusAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const status = by(user.page, ids.issueStatus);
  if ((await status.getAttribute('data-status')) === input.status) return;
  await user.click(status);
  await user.click(issueStatusSelectOption(user.page, input.status));
  await expect(status).toHaveAttribute('data-status', input.status);
};
