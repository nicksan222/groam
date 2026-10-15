import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { by, idFromPath } from './locators';
import { openAppPath } from './open-app-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

/**
 * Opens an issue page directly, typically one arranged through the backend, and returns the
 * short id the app canonicalizes its URL to.
 */
export async function openIssue(page: Page, issueId: string): Promise<string> {
  await openAppPath(page, `issues/${issueId}`);
  await expect(by(page, ids.issueHeading)).toHaveAttribute('data-issue-id', /.+/u);
  await expect(page).toHaveURL(/\/issues\/[a-z]{6}(?:[/?#]|$)/u);
  return idFromPath(page, 'issues');
}
