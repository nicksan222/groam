import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripTabs } from './trip-tabs';

const tabs = [
  { key: 'one', label: 'One', testId: 'tab-one' },
  { count: 3, key: 'two', label: 'Two', testId: 'tab-two' },
  { key: 'three', label: 'Three', testId: 'tab-three' }
] as const;

test('lists tabs with counts and opens one on click', async () => {
  const onOpen = vi.fn();
  await render(<TripTabs activeKey="one" ariaLabel="Things" onOpen={onOpen} tabs={tabs} />);
  await expect.element(page.getByRole('button', { name: 'Two (3)' })).toBeInTheDocument();
  await page.getByTestId('tab-three').click();
  expect(onOpen).toHaveBeenCalledWith('three');
  await expect.element(page.getByTestId('tab-one')).toHaveClass('border-primary');
});

test('disables every tab while loading', async () => {
  await render(<TripTabs activeKey="one" ariaLabel="Things" disabled tabs={tabs} />);
  await expect.element(page.getByTestId('tab-two')).toBeDisabled();
});

test('a phone strip scrolls and keeps the active tab fully in view', async () => {
  await useViewport(240, 600);
  await render(<TripTabs activeKey="three" ariaLabel="Things" tabs={tabs} />);
  const strip = page.getByRole('navigation', { name: 'Things' }).element().firstElementChild;
  if (!(strip instanceof HTMLElement)) throw new Error('Expected a tab strip');
  expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
  const active = page.getByTestId('tab-three').element().getBoundingClientRect();
  const frame = strip.getBoundingClientRect();
  expect(active.right).toBeLessThanOrEqual(frame.right + 1);
  expect(active.left).toBeGreaterThanOrEqual(frame.left - 1);
});
