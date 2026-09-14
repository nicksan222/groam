import { type Page, expect as playwrightExpect } from '@playwright/test';
import { appPath } from './app-href';
import { expectTripsReady } from './expect-trips-ready';
import { ids } from './ids';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type SignInCredentials = {
  email: string;
  password: string;
};

export type SignInOptions = {
  colorScheme?: 'dark' | 'light';
  destinationFixtures?: unknown[];
};

export async function signInAs(
  page: Page,
  credentials: SignInCredentials,
  options: SignInOptions = {}
): Promise<void> {
  if (options.colorScheme) {
    await page.addInitScript(
      (scheme) => localStorage.setItem('groam-theme', scheme),
      options.colorScheme
    );
  }
  if (options.destinationFixtures) {
    await page.route('https://photon.komoot.io/api/**', (route) =>
      route.fulfill({
        json: { type: 'FeatureCollection', features: options.destinationFixtures }
      })
    );
  }
  await page.goto(appPath);
  await by(page, ids.authEmail).fill(credentials.email);
  await by(page, ids.authPassword).fill(credentials.password);
  await by(page, ids.authSubmit).click();
  await expect(by(page, ids.homeDashboard).or(by(page, ids.tripsTitle))).toBeVisible({
    timeout: 30_000
  });
  if (await by(page, ids.homeDashboard).isVisible()) {
    const desktopTrips = by(page, ids.navTrips);
    await ((await desktopTrips.isVisible()) ? desktopTrips : by(page, ids.mobileNavTrips)).click();
  }
  await expectTripsReady(page);
  if (options.colorScheme) {
    await expect(page.locator('html')).toHaveClass(
      options.colorScheme === 'dark' ? /\bdark\b/u : /\blight\b/u
    );
  }
}
