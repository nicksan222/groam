import {
  by,
  completeOnboarding,
  expectHomeDashboard,
  ids,
  signIn,
  signOut
} from '@groam/app-actions/vitest';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { openSignedOutApp } from '@/journeys/open-app';

test.each([320, 390])(
  'a %spx phone user can sign up, create a group, and retry a rejected password',
  async (width) => {
    await useViewport(width, 844);
    await openSignedOutApp();
    await expect.element(by(ids.authSubmit)).toBeVisible();
    expect(by(ids.authSubmit).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);

    const { user } = await completeOnboarding({ groupName: `Mobile crew ${Date.now()}` });
    await expectHomeDashboard();
    await signOut();

    await signIn({ email: user.username, password: 'Wrong-password-1234' });
    await expect.element(page.getByRole('alert')).toBeVisible();
    await expect.element(by(ids.authSubmit)).toBeEnabled();
    await expect.element(by(ids.authPassword)).toBeEnabled();

    await signIn({ email: user.username, password: user.password });
    await expectHomeDashboard();
  }
);
