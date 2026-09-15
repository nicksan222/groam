import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FormField } from './form-field';
import { Input } from './input';
import { Textarea } from './textarea';

test('wires label htmlFor to the control id and marks required fields', () => {
  render(
    <FormField label="Trip name" required>
      <Input aria-label="Trip name" />
    </FormField>
  );

  const input = screen.getByRole('textbox', { name: 'Trip name' });
  const label = screen.getByText('Trip name').closest('label');
  expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
  expect(screen.getByText('*')).toBeTruthy();
});

test('renders helper description copy beneath the control', () => {
  render(
    <FormField description="Shown on trip cards." label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  expect(screen.getByText('Shown on trip cards.')).toBeTruthy();
});

test('renders field-level errors with alert semantics', () => {
  render(
    <FormField error="Trip name is required" label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  const alert = screen.getByRole('alert');
  expect(alert.textContent).toBe('Trip name is required');
  expect(alert.className).toContain('text-destructive');
});

test('assigns the generated id to textarea controls', () => {
  render(
    <FormField label="Notes">
      <Textarea aria-label="Notes" />
    </FormField>
  );

  const textarea = screen.getByRole('textbox', { name: 'Notes' });
  const label = screen.getByText('Notes').closest('label');
  expect(label?.getAttribute('for')).toBe(textarea.getAttribute('id'));
});

test('applies layout class names to the field wrapper', () => {
  const { container } = render(
    <FormField className="max-w-md" label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  expect(container.firstElementChild?.className).toContain('max-w-md');
  expect(container.firstElementChild?.className).toContain('content-start');
});
