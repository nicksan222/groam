import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { NextStepBanner } from './next-step-banner';

test('renders the next-step eyebrow, title, and action', async () => {
  const onAction = vi.fn();

  await render(
    <NextStepBanner
      action="Add first destination"
      onAction={onAction}
      title="Choose where this trip begins"
    />
  );

  await expect.element(page.getByText('Up next')).toBeInTheDocument();
  await expect
    .element(page.getByRole('heading', { name: 'Choose where this trip begins' }))
    .toBeInTheDocument();
  await page.getByRole('button', { name: 'Add first destination' }).click();
  expect(onAction).toHaveBeenCalledTimes(1);
});
