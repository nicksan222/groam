import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { LoadingPlaceholder } from './loading-placeholder';

test('renders a spinner with the default loading label', async () => {
  await render(<LoadingPlaceholder />);

  await expect.element(page.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  await expect.element(page.getByText('Loading…')).toBeInTheDocument();
});

test('applies the bordered card chrome and a custom label', async () => {
  const { container } = await render(<LoadingPlaceholder bordered label="Loading ideas…" />);
  const placeholder = container.firstElementChild;

  await expect.element(page.getByRole('status', { name: 'Loading ideas…' })).toBeInTheDocument();
  expect(placeholder?.className).toContain('rounded-xl');
  expect(placeholder?.className).toContain('border');
  expect(placeholder?.className).toContain('min-h-40');
  expect(placeholder?.getAttribute('data-layout')).toBe('list');
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
});

test('merges layout class names onto the placeholder', async () => {
  const { container } = await render(<LoadingPlaceholder className="min-h-80 py-4" />);
  expect(container.firstElementChild?.className).toContain('min-h-80');
  expect(container.firstElementChild?.className).toContain('py-4');
});

test('page density fills a typical content viewport with a list skeleton', async () => {
  const { container } = await render(<LoadingPlaceholder density="page" label="Loading trips…" />);
  expect(container.firstElementChild?.className).toContain('min-h-80');
  expect(container.firstElementChild?.getAttribute('data-layout')).toBe('list');
  await expect.element(page.getByRole('status', { name: 'Loading trips…' })).toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(3);
});

test('detail layout sketches a page body and sidebar', async () => {
  const { container } = await render(
    <LoadingPlaceholder density="page" label="Loading trip…" layout="detail" />
  );
  expect(container.firstElementChild?.getAttribute('data-layout')).toBe('detail');
  await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
});
