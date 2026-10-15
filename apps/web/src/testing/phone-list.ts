import { expect } from 'vite-plus/test';
import { type Locator, page } from 'vite-plus/test/browser';

/** On a phone a list row keeps a readable title and its status, and the page never scrolls sideways. */
export async function expectPhoneListRow(row: Locator): Promise<void> {
  await expect.element(row).toBeVisible();
  const cells = [...row.element().querySelectorAll('td')];
  await expect.poll(() => cells[0]?.getBoundingClientRect().width).toBeGreaterThan(200);
  expect(cells.filter((cell) => cell.checkVisibility())).toHaveLength(2);
  await expect.element(page.getByRole('button', { name: 'Columns' })).not.toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
}
