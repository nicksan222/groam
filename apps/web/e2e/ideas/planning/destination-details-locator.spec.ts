import { ids, openDestinationDetails } from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

for (const label of [
  'Open Porto, Portugal details for Day 1',
  'Manage Porto, Portugal for Day 1'
]) {
  test(`opens destination details from ${label}`, async ({ page }) => {
    await page.setContent(`
      <button>${label}</button>
      <section data-testid="${ids.destinationCard}" data-place-name="Porto, Portugal" hidden>
        Destination schedule
      </section>
    `);
    await page.evaluate(() => {
      document.querySelector('button')?.addEventListener('click', () => {
        document.querySelector('section')?.removeAttribute('hidden');
      });
    });

    await openDestinationDetails(page, 'Porto, Portugal');

    await expect(page.getByTestId(ids.destinationCard)).toBeVisible();
  });
}
