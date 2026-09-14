import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ErrorWell } from './error-well';

afterEach(cleanup);

test('renders destructive alert copy', () => {
  const { container } = render(<ErrorWell>Search failed</ErrorWell>);

  expect(screen.getByRole('alert').textContent).toBe('Search failed');
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('error-well');
});
