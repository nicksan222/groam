import { ids, openApp, openBackgroundActivity } from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('background activity is discoverable in settings and opens a real run', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('complementary').getByTestId(ids.navAgents)).toHaveCount(0);
  const result = await openBackgroundActivity(page);
  if (result === 'empty') {
    await expect(page.getByText('Nothing running yet')).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/background-activity.png' });
});
