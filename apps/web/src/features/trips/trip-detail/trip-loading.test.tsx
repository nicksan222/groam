import { PageLoading } from '@groam/ui/components/page-loading';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripPageShell } from './trip-page-shell';

test('trip notices float in a bottom dock after the body', async () => {
  await render(
    <TripPageShell
      banner={<div data-testid="trip-notice">Notice</div>}
      body={<div>Trip content</div>}
      header={<div>Trip title</div>}
      notice={<div>Second notice</div>}
    />
  );

  const dock = page.getByTestId('trip-notice').element().parentElement;
  expect(dock?.getAttribute('data-slot')).toBe('trip-floating-notices');
  expect(dock?.previousElementSibling?.getAttribute('data-slot')).toBe('trip-page-body');
  expect(dock?.textContent).toBe('NoticeSecond notice');
  expect(dock && getComputedStyle(dock).position).toBe('sticky');
  expect(dock && getComputedStyle(dock).bottom).toBe('0px');
});

test('the notice dock takes no space when every notice renders nothing', async () => {
  const { container } = await render(
    <TripPageShell banner={null} body={<div>Trip content</div>} header={<div>Trip title</div>} />
  );

  const dock = container.querySelector('[data-slot="trip-floating-notices"]');
  expect(dock && getComputedStyle(dock).display).toBe('none');
});

test('trip page uses one shared loading surface without rendering its unknown content', async () => {
  const { container } = await render(
    <TripPageShell body={<PageLoading label="Loading trip…" />} header={null} isLoading />
  );

  await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});
