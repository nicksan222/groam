import { expect as playwrightExpect } from '@playwright/test';
import type { AssignIssueAction } from '#src/actions/assign-issue';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';
import { ids } from '#src/testing/ids';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const assignIssue: AssignIssueAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  await user.click(by(user.page, ids.issueEditAssignees));
  if (input.assignee?.kind === 'agent') {
    await user.click(by(user.page, ids.issueAssignGroam));
    await expect(user.page.getByText('Issue agent', { exact: true }).first()).toBeVisible();
    return;
  }
  if (input.assignee?.kind === 'me') {
    await user.click(by(user.page, ids.issueAssignMe));
    await expect(by(user.page, ids.issueEditAssignees)).toBeEnabled();
    return;
  }
  if (input.assignee?.kind === 'user') {
    await user.click(user.page.getByRole('button', { name: `Assign ${input.assignee.name}` }));
    await expect(user.page.getByText(input.assignee.name, { exact: true }).first()).toBeVisible();
    return;
  }
  const assigned = user.page.getByRole('button', { name: /^Unassign /u });
  if (await assigned.isVisible()) await user.click(assigned);
};
