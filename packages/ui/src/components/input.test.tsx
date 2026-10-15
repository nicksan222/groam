import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { Input } from './input';

test('renders a text input with shared field styling', async () => {
  await render(<Input aria-label="Trip name" placeholder="Paris getaway" />);

  const input = page.getByRole('textbox', { name: 'Trip name' }).element();
  expect(input.getAttribute('data-slot')).toBe('input');
  expect(input.getAttribute('placeholder')).toBe('Paris getaway');
  expect(input.className).toContain('rounded-lg');
  expect(input.className).toContain('focus-visible:ring-[3px]');
  expect(input.className).toContain('shadow-xs');
});

test('supports password and other input types', async () => {
  await render(<Input aria-label="Password" type="password" />);
  await expect.element(page.getByLabelText('Password')).toHaveAttribute('type', 'password');
});

test('reflects disabled and invalid accessibility states in classes', async () => {
  await render(<Input aria-invalid aria-label="Email" disabled />);

  const input = page.getByRole('textbox', { name: 'Email' }).element();
  expect((input as HTMLInputElement).disabled).toBe(true);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.className).toContain('aria-invalid:border-destructive');
  expect(input.className).toContain('disabled:opacity-64');
});

test('merges custom class names and forwards controlled values', async () => {
  await render(<Input aria-label="Notes" className="max-w-sm" defaultValue="Draft" />);

  const input = page.getByRole('textbox', { name: 'Notes' }).element();
  expect(input.className).toContain('max-w-sm');
  expect((input as HTMLInputElement).value).toBe('Draft');

  await userEvent.fill(input, 'Updated');
  expect((input as HTMLInputElement).value).toBe('Updated');
});
