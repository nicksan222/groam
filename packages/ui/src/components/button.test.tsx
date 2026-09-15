import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Button } from './button';

afterEach(cleanup);

test('renders a native button with default variant styles', () => {
  render(<Button>Save</Button>);

  const button = screen.getByRole('button', { name: 'Save' });
  expect(button.getAttribute('data-slot')).toBe('button');
  expect(button.className).toContain('bg-primary');
  expect(button.className).toContain('h-8');
});

test.each([
  ['destructive', 'bg-destructive'],
  ['outline', 'border'],
  ['secondary', 'bg-secondary'],
  ['ghost', 'hover:bg-muted'],
  ['link', 'underline-offset-4']
] as const)('applies the %s variant', (variant, expectedClass) => {
  render(<Button variant={variant}>Action</Button>);
  expect(screen.getByRole('button', { name: 'Action' }).className).toContain(expectedClass);
});

test.each([
  ['sm', 'h-7'],
  ['lg', 'h-9'],
  ['icon', 'size-8']
] as const)('applies the %s size', (size, expectedClass) => {
  render(
    <Button aria-label="Icon action" size={size}>
      +
    </Button>
  );
  expect(screen.getByRole('button', { name: 'Icon action' }).className).toContain(expectedClass);
});

test('forwards button props and handles clicks', () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick} type="submit">
      Submit
    </Button>
  );

  const button = screen.getByRole('button', { name: 'Submit' });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(button.getAttribute('type')).toBe('submit');

  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test('merges custom class names onto variant output', () => {
  render(<Button className="w-full">Full width</Button>);
  expect(screen.getByRole('button', { name: 'Full width' }).className).toContain('w-full');
});

test('renders asChild by merging props onto the child element', () => {
  render(
    <Button asChild variant="outline">
      <a href="/settings">Settings</a>
    </Button>
  );

  const link = screen.getByRole('link', { name: 'Settings' });
  expect(link.getAttribute('data-slot')).toBe('button');
  expect(link.className).toContain('border');
  expect(link.getAttribute('href')).toBe('/settings');
});
