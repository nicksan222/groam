import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Input } from './input';

afterEach(cleanup);

test('renders a text input with shared field styling', () => {
  render(<Input aria-label="Trip name" placeholder="Paris getaway" />);

  const input = screen.getByRole('textbox', { name: 'Trip name' });
  expect(input.getAttribute('data-slot')).toBe('input');
  expect(input.getAttribute('placeholder')).toBe('Paris getaway');
  expect(input.className).toContain('rounded-lg');
  expect(input.className).toContain('focus-visible:ring-[3px]');
  expect(input.className).toContain('shadow-xs/5');
});

test('supports password and other input types', () => {
  render(<Input aria-label="Password" type="password" />);
  expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
});

test('reflects disabled and invalid accessibility states in classes', () => {
  render(<Input aria-invalid aria-label="Email" disabled />);

  const input = screen.getByRole('textbox', { name: 'Email' });
  expect((input as HTMLInputElement).disabled).toBe(true);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.className).toContain('aria-invalid:border-destructive');
  expect(input.className).toContain('disabled:opacity-64');
});

test('merges custom class names and forwards controlled values', () => {
  render(<Input aria-label="Notes" className="max-w-sm" defaultValue="Draft" />);

  const input = screen.getByRole('textbox', { name: 'Notes' });
  expect(input.className).toContain('max-w-sm');
  expect((input as HTMLInputElement).value).toBe('Draft');

  fireEvent.change(input, { target: { value: 'Updated' } });
  expect((input as HTMLInputElement).value).toBe('Updated');
});
