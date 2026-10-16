import {
  by,
  completeOnboarding,
  createFirstGroup,
  ids,
  signUp,
  uniqueTestUser
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openSignedOutApp } from '@/testing/open-app';

test('requires a typed group name before create group enables', async () => {
  await openSignedOutApp();
  await signUp(uniqueTestUser('onboarding'));

  await expect.element(by(ids.onboardingCreateGroup)).toBeDisabled();
  await expect.element(by(ids.onboardingGroupName)).toHaveAttribute('placeholder', 'The Smiths');
  await createFirstGroup(`Typed Group ${Date.now()}`);
  await expect.element(by(ids.navTrips)).toBeVisible();
});

test('signs up and creates a first group', async () => {
  await openSignedOutApp();
  const { groupName } = await completeOnboarding({ groupName: `Planning Crew ${Date.now()}` });
  await expect.element(by(ids.groupSwitcher)).toHaveAttribute('data-group-name', groupName);
});
