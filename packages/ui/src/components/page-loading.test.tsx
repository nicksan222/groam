import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PageLoading } from './page-loading';

test('announces one loading status without fake controls or skeletons', async () => {
  const { container } = await render(<PageLoading label="Loading trips…" />);
  expect(page.getByRole('status').elements()).toHaveLength(1);
  await expect.element(page.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  await expect.element(page.getByText('Loading trips…')).toBeInTheDocument();
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  expect(container.querySelector('.motion-safe\\:animate-pulse')).toBeTruthy();
});
