import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Kbd } from './kbd';

test('renders a keyboard hint', async () => {
  const { container } = await render(<Kbd>⌘K</Kbd>);

  await expect.element(page.getByText('⌘K')).toBeInTheDocument();
  expect(container.querySelector('kbd')?.getAttribute('data-slot')).toBe('kbd');
});
