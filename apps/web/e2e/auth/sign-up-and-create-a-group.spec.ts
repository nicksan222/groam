import {
  by,
  completeOnboarding,
  createFirstGroup,
  ids,
  signUp,
  uniqueTestUser
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('requires a typed group name before create group enables', async ({ page }) => {
  const user = uniqueTestUser('onboarding');
  await signUp(page, user);

  const createGroupButton = by(page, ids.onboardingCreateGroup);
  await expect(createGroupButton).toBeDisabled();
  await expect(by(page, ids.onboardingGroupName)).toHaveAttribute('placeholder', 'The Smiths');
  await createFirstGroup(page, `Typed Group ${Date.now()}`);
  await expect(by(page, ids.navTrips)).toBeVisible();
});

test('signs up and creates a first group', async ({ page }) => {
  const { groupName } = await completeOnboarding(page, {
    groupName: `Planning Crew ${Date.now()}`
  });
  await expect(by(page, ids.groupSwitcher)).toHaveAttribute('data-group-name', groupName);
});
