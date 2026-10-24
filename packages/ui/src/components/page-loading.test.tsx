import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PageLoading } from './page-loading';

test('announces one loading status without fake controls or skeletons', async () => {
  const { container } = await render(<PageLoading label="Loading trips…" />);
  expect(page.getByRole('status').elements()).toHaveLength(1);
  await expect.element(page.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  await expect.element(page.getByRole('status')).toHaveAttribute('aria-label', 'Loading trips…');
  await expect.element(page.getByText('Loading trips…')).toBeInTheDocument();
  expect(container.querySelector('[data-slot="page-loading"]')).toBeTruthy();
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});

test('hides the decorative orbit and tile from assistive tech', async () => {
  const { container } = await render(<PageLoading />);
  const decoration = container
    .querySelector('[data-slot="page-loading-orbit"]')
    ?.closest('[aria-hidden]');
  expect(decoration?.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelector('.page-loading-orbit')).toBeTruthy();
  await expect.element(page.getByText('Loading your workspace…')).toBeInTheDocument();
});
