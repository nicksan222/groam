import { expect as playwrightExpect } from '@playwright/test';
import { filterIssuesByStatus, type IssueStatusFilter } from './filter-issues-by-status';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, issueRow } from './locators';
import { openIssuesInbox } from './open-issues-inbox';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openIssueFromInbox(
  target: UiTarget,
  title: string,
  options: { status?: IssueStatusFilter } = {}
): Promise<void> {
  const user = ui(target);
  await openIssuesInbox(user);
  if (options.status) await filterIssuesByStatus(user, options.status);
  const row = issueRow(user.page, title);
  await expect(row).toBeVisible();
  await user.click(row);
  await expect(by(user.page, ids.issueHeading)).toContainText(title);
}
