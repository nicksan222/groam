import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormField } from './form-field';
import { Input } from './input';
import { Textarea } from './textarea';

test('wires label htmlFor to the control id and marks required fields', async () => {
  await render(
    <FormField label="Trip name" required>
      <Input aria-label="Trip name" />
    </FormField>
  );

  const input = page.getByRole('textbox', { name: 'Trip name' }).element();
  const label = page
    .getByText(/^Trip name/u)
    .element()
    .closest('label');
  expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
  await expect.element(page.getByText('*')).toBeInTheDocument();
});

test('renders helper description copy beneath the control', async () => {
  await render(
    <FormField description="Shown on trip cards." label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  await expect.element(page.getByText('Shown on trip cards.')).toBeInTheDocument();
});

test('renders field-level errors with alert semantics', async () => {
  await render(
    <FormField error="Trip name is required" label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  const alert = page.getByRole('alert').element();
  expect(alert.textContent).toBe('Trip name is required');
  expect(alert.className).toContain('text-destructive');
});

test('assigns the generated id to textarea controls', async () => {
  await render(
    <FormField label="Notes">
      <Textarea aria-label="Notes" />
    </FormField>
  );

  const textarea = page.getByRole('textbox', { name: 'Notes' }).element();
  const label = page.getByText('Notes').element().closest('label');
  expect(label?.getAttribute('for')).toBe(textarea.getAttribute('id'));
});

test('applies layout class names to the field wrapper', async () => {
  const { container } = await render(
    <FormField className="max-w-md" label="Trip name">
      <Input aria-label="Trip name" />
    </FormField>
  );

  expect(container.firstElementChild?.className).toContain('max-w-md');
  expect(container.firstElementChild?.className).toContain('content-start');
});
