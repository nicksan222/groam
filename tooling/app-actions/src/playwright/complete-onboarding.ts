import type { Page } from '@playwright/test';
import { createFirstGroup } from './create-first-group';
import { signUp } from './sign-up';
import { type TestUserCredentials, uniqueTestUser } from './unique-test-user';

export type CompleteOnboardingInput = {
  groupName?: string;
  user?: TestUserCredentials;
};

export type CompleteOnboardingResult = {
  groupName: string;
  user: TestUserCredentials;
};

export async function completeOnboarding(
  page: Page,
  input?: CompleteOnboardingInput
): Promise<CompleteOnboardingResult> {
  const user = input?.user ?? uniqueTestUser();
  const groupName = input?.groupName ?? `E2E Group ${Date.now()}`;
  await signUp(page, user);
  await createFirstGroup(page, groupName);
  return { groupName, user };
}
