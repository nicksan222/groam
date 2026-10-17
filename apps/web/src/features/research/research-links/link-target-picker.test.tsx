import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { LinkTargetOption } from '@/types/research';
import { LinkTargetPicker } from './link-target-picker';

const options: LinkTargetOption[] = [
  { group: 'Issues', label: 'Book flights', target: { id: 'i1', kind: 'issue' } },
  { group: 'Ideas', label: 'Day trip to Pisa', target: { id: 'd1', kind: 'idea' } },
  { group: 'Stays', label: 'Hotel Roma', target: { id: 's1', kind: 'stay' } }
];

test('lists grouped options, filters by search, and selects one', async () => {
  const onSelect = vi.fn();
  await render(<LinkTargetPicker onSelect={onSelect} options={options} />);
  await page.getByTestId(testIds.linkTargetPicker).click();
  await expect.element(page.getByText('Issues', { exact: true })).toBeVisible();
  expect(page.getByTestId(testIds.linkTargetOption).elements()).toHaveLength(3);

  await page.getByTestId(testIds.linkTargetSearch).fill('pisa');
  expect(page.getByTestId(testIds.linkTargetOption).elements()).toHaveLength(1);

  await page.getByRole('button', { name: 'Day trip to Pisa' }).click();
  expect(onSelect).toHaveBeenCalledWith(options[1]);
});

test('shows an empty message when nothing matches', async () => {
  await render(<LinkTargetPicker onSelect={vi.fn()} options={options} />);
  await page.getByTestId(testIds.linkTargetPicker).click();
  await page.getByTestId(testIds.linkTargetSearch).fill('zzz');
  await expect.element(page.getByText('Nothing to link')).toBeVisible();
});
