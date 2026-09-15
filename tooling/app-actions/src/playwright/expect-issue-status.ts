import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type IssueStatus = 'closed' | 'open';

export async function expectIssueStatus(target: UiTarget, status: IssueStatus): Promise<void> {
  const user = ui(target);
  await expect(by(user.page, ids.issueStatus)).toHaveAttribute('data-status', status);
  await user.point(by(user.page, ids.issueStatus));
}
