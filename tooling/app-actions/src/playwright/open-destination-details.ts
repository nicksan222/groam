import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';
import { destinationCard } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function openDestinationDetails(target: UiTarget, placeName: string): Promise<void> {
  const user = ui(target);
  await user.click(
    user.page.getByRole('button', {
      name: `Open ${placeName} details for Day 1`,
      exact: true
    })
  );
  await expect(destinationCard(user.page, placeName)).toBeVisible();
}
