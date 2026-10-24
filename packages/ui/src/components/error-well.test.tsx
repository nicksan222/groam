import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ErrorWell } from './error-well';

test('renders destructive alert copy', async () => {
  const { container } = await render(<ErrorWell>Search failed</ErrorWell>);

  expect(page.getByRole('alert').element().textContent).toBe('Search failed');
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('error-well');
});

test('the inline size is a compact row without the pane minimum height', async () => {
  const { container } = await render(
    <ErrorWell role="status" size="inline">
      Could not send
    </ErrorWell>
  );

  const well = container.firstElementChild;
  expect(page.getByRole('status').element().textContent).toBe('Could not send');
  expect(well?.className).toContain('text-xs');
  expect(well?.className).not.toContain('min-h-40');
});
