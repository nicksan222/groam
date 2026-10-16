import type { IssueStatusFilter } from '#src/actions/set-issue-status';
import { ids } from '#src/testing/ids';
import { type UiTarget, ui } from './interaction';
import { by, issueStatusOption } from './locators';

export async function filterIssuesByStatus(
  target: UiTarget,
  status: IssueStatusFilter
): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.issueStatusFilter));
  await user.click(issueStatusOption(user.page, status));
}
