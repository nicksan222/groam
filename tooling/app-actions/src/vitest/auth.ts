import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { uniqueTestUser, type TestUserCredentials } from '#src/testing/unique-test-user';
import { by } from './locators';
import { expectGone, tap, enter } from './queries';

/** Signs up through the auth form of a signed-out app. */
export async function signUp(user: TestUserCredentials): Promise<void> {
  await expect.element(by(ids.authSubmit)).toBeVisible();
  // A signed-out app opens on the sign-in form; its switch link leads to sign-up.
  await expect.element(by(ids.authSwitchFlow)).toMatchTextContent('Sign up');
  await tap(by(ids.authSwitchFlow));
  await expect.element(by(ids.authName)).toBeVisible();
  await enter(by(ids.authName), user.name);
  await enter(by(ids.authEmail), user.username);
  await enter(by(ids.authSignupEmail), `${user.username}@example.com`);
  await enter(by(ids.authPassword), user.password);
  await tap(by(ids.authSubmit));
  await expectGone(page.getByRole('alert'));
  await expect.element(by(ids.onboardingWelcome)).toBeVisible();
}

export async function expectWorkspaceReady(): Promise<void> {
  await expect.element(by(ids.navHome)).toBeVisible();
}

export async function createFirstGroup(groupName: string): Promise<void> {
  const createGroupButton = by(ids.onboardingCreateGroup);
  await expect.element(createGroupButton).toBeDisabled();
  await enter(by(ids.onboardingGroupName), groupName);
  await expect.element(createGroupButton).toBeEnabled();
  await tap(createGroupButton);
  await expectWorkspaceReady();
}

export type CompleteOnboardingInput = { groupName?: string; user?: TestUserCredentials };

export async function completeOnboarding(input?: CompleteOnboardingInput) {
  const user = input?.user ?? uniqueTestUser();
  const groupName = input?.groupName ?? `E2E Group ${Date.now()}`;
  await signUp(user);
  await createFirstGroup(groupName);
  return { groupName, user };
}

/** Signs out through the user menu and waits for the auth form. */
export async function signOut(): Promise<void> {
  await tap(by(ids.navUserTrigger));
  await tap(page.getByRole('menuitem', { name: 'Sign out' }));
  await expect.element(by(ids.authSubmit)).toBeVisible();
}

/** Fills the auth form's credentials and submits it. */
export async function signIn(credentials: { email: string; password: string }): Promise<void> {
  await enter(by(ids.authEmail), credentials.email);
  await enter(by(ids.authPassword), credentials.password);
  // A form that re-renders under a busy machine can drop the first field; fail on that, not on a later step.
  await expect.element(by(ids.authEmail)).toHaveValue(credentials.email);
  await tap(by(ids.authSubmit));
}
