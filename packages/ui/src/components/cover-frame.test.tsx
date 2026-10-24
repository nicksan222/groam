import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CoverFrame } from './cover-frame';

test('renders the cover image when a source is provided', async () => {
  await render(<CoverFrame alt="Lisbon waterfront" className="aspect-[2/1]" src="/cover.jpg" />);

  const image = page.getByRole('img', { name: 'Lisbon waterfront' }).element();
  expect(image.getAttribute('src')).toBe('/cover.jpg');
  expect(image.className).toContain('object-cover');
  expect(image.parentElement?.className).toContain('aspect-[2/1]');
});

test('renders a fallback when the cover source is missing', async () => {
  await render(<CoverFrame alt="Untitled trip" fallback={<span>No cover</span>} src={null} />);

  await expect.element(page.getByRole('img')).not.toBeInTheDocument();
  await expect.element(page.getByText('No cover')).toBeInTheDocument();
});
