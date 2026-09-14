import { type Page, expect as playwrightExpect } from '@playwright/test';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type MobileWorkspaceList = 'ideas' | 'issues';

export async function openFirstMobileListRow(page: Page, area: MobileWorkspaceList): Promise<void> {
  const row = page
    .locator('tbody tr')
    .filter({ has: page.locator(area === 'ideas' ? 'h4' : 'a[title]') })
    .first();
  await expect(row).toBeVisible();
  const title = row.locator('td').first();
  await expect.poll(async () => (await title.boundingBox())?.width ?? 0).toBeGreaterThan(200);
  await expect(row.locator('td:visible')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Columns', exact: true })).toHaveCount(0);
  await title.click();
}
