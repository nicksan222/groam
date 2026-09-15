import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { sharedTripPath } from './shared-trip-path';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type SharedItineraryExpectation = {
  activity: string;
  dateWindow?: string;
};

export async function showSharedItinerary(
  targets: readonly UiTarget[],
  expected: SharedItineraryExpectation
): Promise<void> {
  const path = targets.map(sharedTripPath).find((candidate) => candidate !== undefined);
  if (!path) throw new Error('Expected at least one participant to be viewing the trip');
  for (const target of targets) {
    const user = ui(target);
    await user.page.goto(path);
    await expect(user.page).not.toHaveURL(/\/ideas\//u);
    await user.click(user.page.getByTestId(ids.tripSectionOverview));
    const activity = user.page.getByText(expected.activity, { exact: true }).first();
    await expect(async () => {
      await activity.scrollIntoViewIfNeeded();
      await expect(activity).toBeInViewport();
    }).toPass({ timeout: 20_000 });
    if (expected.dateWindow) {
      await expect(
        user.page.getByRole('region', { name: 'Trip at a glance', exact: true })
      ).toContainText(expected.dateWindow);
    }
  }
}
