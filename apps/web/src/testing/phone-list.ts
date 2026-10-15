import { expect } from 'vite-plus/test';
import { type Locator, page } from 'vite-plus/test/browser';

/** The row's cells the browser currently shows, read fresh because a re-render replaces nodes. */
function visibleCells(row: Locator): HTMLTableCellElement[] {
  return [...row.element().querySelectorAll('td')].filter((cell) => cell.checkVisibility());
}

/** On a phone a list row keeps a readable title and its status, and the page never scrolls sideways. */
export async function expectPhoneListRow(row: Locator): Promise<void> {
  await expect.element(row).toBeVisible();
  await expect
    .poll(() => row.element().querySelector('td')?.getBoundingClientRect().width)
    .toBeGreaterThan(200);
  await expect.poll(() => visibleCells(row)).toHaveLength(2);
  await expect.element(page.getByRole('button', { name: 'Columns' })).not.toBeInTheDocument();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
}

/** On a wide screen a list row shows its secondary columns next to the title and status. */
export async function expectWideListRow(row: Locator): Promise<void> {
  await expect.element(row).toBeVisible();
  await expect.poll(() => visibleCells(row).length).toBeGreaterThan(2);
}
