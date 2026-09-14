import { expect as playwrightExpect } from '@playwright/test';
import type { SetIssueStatusAction } from '#src/actions/set-issue-status';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const setIssueStatus: SetIssueStatusAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const status = by(user.page, ids.issueStatus);
  if ((await status.getAttribute('data-status')) === input.status) return;
  await user.click(by(user.page, ids.issueToggleStatus));
  await expect(status).toHaveAttribute('data-status', input.status);
};
