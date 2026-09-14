import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CoverFrame } from './cover-frame';

afterEach(cleanup);

test('renders the cover image when a source is provided', () => {
  render(<CoverFrame alt="Lisbon waterfront" className="aspect-[2/1]" src="/cover.jpg" />);

  const image = screen.getByRole('img', { name: 'Lisbon waterfront' });
  expect(image.getAttribute('src')).toBe('/cover.jpg');
  expect(image.className).toContain('object-cover');
  expect(image.parentElement?.className).toContain('aspect-[2/1]');
});

test('renders a fallback when the cover source is missing', () => {
  render(<CoverFrame alt="Untitled trip" fallback={<span>No cover</span>} src={null} />);

  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('No cover')).toBeTruthy();
});
