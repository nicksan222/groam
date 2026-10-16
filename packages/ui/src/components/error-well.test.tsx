import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ErrorWell } from './error-well';

test('renders destructive alert copy', async () => {
  const { container } = await render(<ErrorWell>Search failed</ErrorWell>);

  expect(page.getByRole('alert').element().textContent).toBe('Search failed');
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('error-well');
});
