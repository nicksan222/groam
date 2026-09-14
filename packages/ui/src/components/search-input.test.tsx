import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SearchInput } from './search-input';

afterEach(cleanup);

test('renders a compact search field with icon, placeholder, and label', () => {
  const { container } = render(
    <SearchInput aria-label="Search activity" placeholder="Search activity…" />
  );

  const field = container.querySelector('[data-slot="search-input"]');
  expect(field?.className).toContain('relative');
  expect(field?.className).toContain('min-w-0');
  expect(field?.className).toContain('flex-1');
  expect(field?.querySelector('svg')).toBeTruthy();

  const input = screen.getByRole('searchbox', { name: 'Search activity' });
  expect(input.getAttribute('placeholder')).toBe('Search activity…');
  expect(input.getAttribute('type')).toBe('search');
  expect(input.className).toContain('h-8');
  expect(input.className).toContain('pl-8');
  expect(input.className).toContain('bg-transparent');
});

test('forwards controlled value, onChange, and disabled', () => {
  const seen: string[] = [];
  const { rerender } = render(
    <SearchInput
      aria-label="Filter people"
      onChange={(event) => seen.push(event.target.value)}
      value="Alex"
    />
  );

  const input = screen.getByRole('searchbox', { name: 'Filter people' }) as HTMLInputElement;
  expect(input.value).toBe('Alex');
  fireEvent.change(input, { target: { value: 'Sam' } });
  expect(seen).toEqual(['Sam']);

  rerender(<SearchInput aria-label="Filter people" disabled value="Alex" />);
  expect(
    (screen.getByRole('searchbox', { name: 'Filter people' }) as HTMLInputElement).disabled
  ).toBe(true);
});

test('merges layout class names onto the wrapper', () => {
  const { container } = render(<SearchInput aria-label="Search trips" className="max-w-sm" />);

  expect(container.firstElementChild?.className).toContain('max-w-sm');
  expect(container.firstElementChild?.className).toContain('flex-1');
});
