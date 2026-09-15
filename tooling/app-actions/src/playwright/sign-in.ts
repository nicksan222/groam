import { env } from '@groam/env/playwright';
import type { Page } from '@playwright/test';
import { signInAs } from './sign-in-as';

export async function signIn(page: Page): Promise<void> {
  await signInAs(page, { email: env.userEmail, password: env.userPassword });
}
