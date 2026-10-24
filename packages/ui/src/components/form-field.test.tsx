import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Form } from './form';
import { FormField } from './form-field';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';

test('wires label htmlFor to the control id and announces required fields', async () => {
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
  expect(input.getAttribute('aria-required')).toBe('true');
  await expect.element(page.getByText('*')).not.toBeInTheDocument();
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

test('passes maxLength to the control and counts only near the limit', async () => {
  const { rerender } = await render(
    <FormField label="Question" maxLength={10}>
      <Input aria-label="Question" onChange={() => {}} value="abc" />
    </FormField>
  );
  await expect
    .element(page.getByRole('textbox', { name: 'Question' }))
    .toHaveAttribute('maxlength', '10');
  await expect.element(page.getByText('3/10')).not.toBeInTheDocument();
  await rerender(
    <FormField label="Question" maxLength={10}>
      <Input aria-label="Question" onChange={() => {}} value="abcdefghi" />
    </FormField>
  );
  await expect.element(page.getByText('9/10')).toBeInTheDocument();
});

test('marks optional fields and flags the control invalid on error', async () => {
  await render(
    <FormField error="Too short" label="Brief" optional>
      <Input aria-label="Brief" />
    </FormField>
  );
  await expect.element(page.getByText('Optional')).toBeInTheDocument();
  await expect
    .element(page.getByRole('textbox', { name: 'Brief' }))
    .toHaveAttribute('aria-invalid', 'true');
});

test('split puts the label in its own column; inline puts the control first', async () => {
  await render(
    <>
      <FormField label="Display name" layout="split">
        <Input aria-label="Display name" />
      </FormField>
      <FormField label="Allow several choices" layout="inline">
        <input aria-label="Allow several choices" type="checkbox" />
      </FormField>
    </>
  );
  const [split, inline] = [...document.querySelectorAll('[data-slot=form-field]')];
  expect(split?.className).toContain('lg:grid-cols-[12rem_minmax(0,1fr)]');
  expect(inline?.firstElementChild?.tagName).toBe('INPUT');
});

test('labels a Select through its trigger', async () => {
  await render(
    <FormField error="Pick one" label="Currency">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="eur">EUR</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
  const trigger = page.getByRole('combobox', { name: 'Currency' });
  await expect.element(trigger).toBeInTheDocument();
  await expect.element(trigger).toHaveAttribute('aria-invalid', 'true');
});

test('fields inside a settings Form take the split layout with rules between them', async () => {
  await render(
    <Form density="settings" onSubmit={() => {}}>
      <FormField label="Display name">
        <Input aria-label="Display name" />
      </FormField>
      <FormField label="Username">
        <Input aria-label="Username" />
      </FormField>
    </Form>
  );
  const [first, second] = [...document.querySelectorAll('[data-slot=form-field]')];
  expect(first?.className).toContain('lg:grid-cols-[12rem_minmax(0,1fr)]');
  // The rule sits between fields: on the second, never below the last.
  expect(getComputedStyle(first as Element).borderTopWidth).toBe('0px');
  expect(getComputedStyle(second as Element).borderTopWidth).toBe('1px');
});
