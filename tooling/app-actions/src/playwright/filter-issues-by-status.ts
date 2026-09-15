import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, issueStatusOption } from './locators';

export type IssueStatusFilter = 'all' | 'closed' | 'open';

export async function filterIssuesByStatus(
  target: UiTarget,
  status: IssueStatusFilter
): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.issueStatusFilter));
  await user.click(issueStatusOption(user.page, status));
}
