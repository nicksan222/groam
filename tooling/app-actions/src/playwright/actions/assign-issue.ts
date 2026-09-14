import { expect as playwrightExpect } from '@playwright/test';
import type { AssignIssueAction } from '#src/actions/assign-issue';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const assignIssue: AssignIssueAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await user.click(by(user.page, ids.issueEditAssignees));
  if (input.assignee?.kind === 'agent') {
    await user.click(by(user.page, ids.issueAssignGroam));
    await expect(user.page.getByText('Issue agent', { exact: true }).first()).toBeVisible();
    return;
  }
  if (input.assignee?.kind === 'user') {
    await user.click(user.page.getByRole('menuitem', { name: input.assignee.name }));
    await expect(user.page.getByText(input.assignee.name, { exact: true }).first()).toBeVisible();
    return;
  }
  const assigned = user.page.getByRole('menuitem', { name: /^Unassign /u });
  if (await assigned.isVisible()) await user.click(assigned);
};
