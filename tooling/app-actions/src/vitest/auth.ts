import { expect, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { uniqueTestUser, type TestUserCredentials } from '#src/testing/unique-test-user';
import { by } from './locators';
import { isVisible, tap, enter } from './queries';

/** Signs up through the auth form of a signed-out app. */
export async function signUp(user: TestUserCredentials): Promise<void> {
  await expect.element(by(ids.authSubmit)).toBeVisible();
  if (!isVisible(by(ids.authName))) await tap(by(ids.authSwitchFlow));
  await expect.element(by(ids.authName)).toBeVisible();
  await enter(by(ids.authName), user.name);
  await enter(by(ids.authEmail), user.username);
  await enter(by(ids.authPassword), user.password);
  await tap(by(ids.authSubmit));
  await expect.poll(() => page.getByRole('alert').elements().length).toBe(0);
  await expect.element(by(ids.onboardingWelcome)).toBeVisible();
}

export async function expectWorkspaceReady(): Promise<void> {
  const retry = by(ids.workspaceErrorRetry);
  if (isVisible(retry)) await tap(retry);
  await expect.element(by(ids.navTrips)).toBeVisible();
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

export async function signOut(): Promise<void> {
  await vi.waitFor(
    async () => {
      if (isVisible(by(ids.authSubmit))) return;
      const menuItem = page.getByRole('menuitem', { name: 'Sign out' });
      if (!isVisible(menuItem)) await tap(by(ids.navUserTrigger));
      await menuItem.click({ timeout: 2000 });
      await expect.element(by(ids.authSubmit), { timeout: 2000 }).toBeVisible();
    },
    { timeout: 10_000 }
  );
}

/** Fills the auth form's credentials and submits it. */
export async function signIn(credentials: { email: string; password: string }): Promise<void> {
  await enter(by(ids.authEmail), credentials.email);
  await enter(by(ids.authPassword), credentials.password);
  await tap(by(ids.authSubmit));
}
