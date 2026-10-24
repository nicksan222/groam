import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { SearchInput } from './search-input';

test('renders a compact search field with icon, placeholder, and label', async () => {
  const { container } = await render(
    <SearchInput aria-label="Search activity" placeholder="Search activity…" />
  );

  const field = container.querySelector('[data-slot="search-input"]');
  expect(field?.className).toContain('relative');
  expect(field?.className).toContain('min-w-0');
  expect(field?.className).toContain('flex-1');
  expect(field?.querySelector('svg')).toBeTruthy();

  const input = page.getByRole('searchbox', { name: 'Search activity' }).element();
  expect(input.getAttribute('placeholder')).toBe('Search activity…');
  expect(input.getAttribute('type')).toBe('search');
  expect(input.className).toContain('h-8');
  expect(input.className).toContain('pl-8');
  expect(input.className).toContain('bg-transparent');
});

test('forwards controlled value, onChange, and disabled', async () => {
  const seen: string[] = [];
  const { rerender } = await render(
    <SearchInput
      aria-label="Filter people"
      onChange={(event) => seen.push(event.target.value)}
      value="Alex"
    />
  );

  const input = page
    .getByRole('searchbox', { name: 'Filter people' })
    .element() as HTMLInputElement;
  expect(input.value).toBe('Alex');
  await userEvent.fill(input, 'Sam');
  expect(seen).toEqual(['Sam']);

  await rerender(<SearchInput aria-label="Filter people" disabled value="Alex" />);
  await expect.element(page.getByRole('searchbox', { name: 'Filter people' })).toBeDisabled();
});

test('merges layout class names onto the wrapper', async () => {
  const { container } = await render(
    <SearchInput aria-label="Search trips" className="max-w-sm" />
  );

  expect(container.firstElementChild?.className).toContain('max-w-sm');
  expect(container.firstElementChild?.className).toContain('flex-1');
});
