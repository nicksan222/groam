import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Form } from './form';
import { FormActions } from './form-actions';

test('renders fields, then feedback, then actions, and submits', async () => {
  const onSubmit = vi.fn((event) => event.preventDefault());
  await render(
    <Form
      actions={<FormActions submitLabel="Save" />}
      aria-label="Profile"
      error="Name is required"
      onSubmit={onSubmit}
    >
      <input aria-label="Name" />
    </Form>
  );
  const form = page.getByRole('form', { name: 'Profile' }).element();
  const order = [...form.children].map((child) => child.getAttribute('data-slot') ?? child.tagName);
  expect(order).toEqual(['INPUT', 'P', 'form-actions']);
  expect(page.getByRole('alert').element().textContent).toBe('Name is required');
  await page.getByRole('button', { name: 'Save' }).click();
  expect(onSubmit).toHaveBeenCalledOnce();
});

test('marks itself busy while pending and spaces settings forms more loosely', async () => {
  await render(
    <Form aria-label="Profile" density="relaxed" isPending onSubmit={() => {}}>
      <input aria-label="Name" />
    </Form>
  );
  const form = page.getByRole('form', { name: 'Profile' });
  await expect.element(form).toHaveAttribute('aria-busy', 'true');
  await expect.element(form).toHaveClass('gap-6');
});
