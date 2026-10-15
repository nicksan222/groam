import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { by, idFromPath } from './locators';
import { openAppPath } from './open-app-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type OpenIdeaInput = {
  proposalId: string;
  tripId: string;
};

/**
 * Opens an idea's overview directly, typically one arranged through the backend, and returns
 * the short ids the app canonicalizes its URL to.
 */
export async function openIdea(page: Page, input: OpenIdeaInput): Promise<OpenIdeaInput> {
  await openAppPath(page, `trips/${input.tripId}/ideas/${input.proposalId}/overview`);
  await expect(by(page, ids.ideaWorkspace)).toBeVisible();
  await expect(by(page, ids.tripHeading)).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/[a-z]{6}\/ideas\/[a-z]{6}\/overview/u);
  return { proposalId: idFromPath(page, 'ideas'), tripId: idFromPath(page, 'trips') };
}
