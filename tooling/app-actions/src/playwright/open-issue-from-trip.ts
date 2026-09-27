import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, issueRow } from './locators';
import { openAppPath } from './open-app-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openIssueFromTrip(
  target: UiTarget,
  tripId: string,
  title: string
): Promise<void> {
  const user = ui(target);
  await openAppPath(user.page, `trips/${tripId}/issues`);
  const row = issueRow(user.page, title);
  await expect(row).toBeVisible();
  await user.click(row);
  await expect(by(user.page, ids.issueHeading)).toContainText(title);
}
