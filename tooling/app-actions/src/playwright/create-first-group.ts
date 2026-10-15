import { expect, type Page } from '@playwright/test';
import { ids } from '#src/testing/ids';
import { expectWorkspaceReady } from './expect-workspace-ready';
import { by } from './locators';

export async function createFirstGroup(page: Page, groupName: string): Promise<void> {
  const createGroupButton = by(page, ids.onboardingCreateGroup);
  await expect(createGroupButton).toBeDisabled();
  await by(page, ids.onboardingGroupName).fill(groupName);
  await expect(createGroupButton).toBeEnabled();
  await createGroupButton.click();
  await expectWorkspaceReady(page);
}
