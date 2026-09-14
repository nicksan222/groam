import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { PageLoading } from './page-loading';

afterEach(cleanup);

test('announces one loading status without fake controls or skeletons', () => {
  const { container } = render(<PageLoading label="Loading trips…" />);
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  expect(screen.getByText('Loading trips…')).toBeTruthy();
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(container.querySelector('.motion-safe\\:animate-pulse')).toBeTruthy();
});
