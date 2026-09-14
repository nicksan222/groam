import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { LoadingPlaceholder } from './loading-placeholder';

afterEach(cleanup);

test('renders a spinner with the default loading label', () => {
  render(<LoadingPlaceholder />);

  expect(screen.getByRole('status', { name: 'Loading…' })).toBeTruthy();
  expect(screen.getByText('Loading…')).toBeTruthy();
});

test('applies the bordered card chrome and a custom label', () => {
  const { container } = render(<LoadingPlaceholder bordered label="Loading ideas…" />);
  const placeholder = container.firstElementChild;

  expect(screen.getByRole('status', { name: 'Loading ideas…' })).toBeTruthy();
  expect(placeholder?.className).toContain('rounded-xl');
  expect(placeholder?.className).toContain('border');
  expect(placeholder?.className).toContain('min-h-40');
  expect(placeholder?.getAttribute('data-layout')).toBe('list');
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
});

test('merges layout class names onto the placeholder', () => {
  const { container } = render(<LoadingPlaceholder className="min-h-80 py-4" />);
  expect(container.firstElementChild?.className).toContain('min-h-80');
  expect(container.firstElementChild?.className).toContain('py-4');
});

test('page density fills a typical content viewport with a list skeleton', () => {
  const { container } = render(<LoadingPlaceholder density="page" label="Loading trips…" />);
  expect(container.firstElementChild?.className).toContain('min-h-80');
  expect(container.firstElementChild?.getAttribute('data-layout')).toBe('list');
  expect(screen.getByRole('status', { name: 'Loading trips…' })).toBeTruthy();
  expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(3);
});

test('detail layout sketches a page body and sidebar', () => {
  const { container } = render(
    <LoadingPlaceholder density="page" label="Loading trip…" layout="detail" />
  );
  expect(container.firstElementChild?.getAttribute('data-layout')).toBe('detail');
  expect(screen.getByRole('status', { name: 'Loading trip…' })).toBeTruthy();
});
