import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormDialog } from './form-dialog';

async function renderFormDialog(props: Partial<ComponentProps<typeof FormDialog>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn((event) => event.preventDefault());

  await render(
    <FormDialog
      description="Add a new trip to your workspace."
      onClose={onClose}
      onSubmit={onSubmit}
      open
      submitLabel="Create trip"
      title="Create trip"
      {...props}
    >
      <input aria-label="Trip name" />
    </FormDialog>
  );

  return { onClose, onSubmit };
}

test('renders dialog metadata, children, and action buttons when open', async () => {
  await renderFormDialog();

  await expect.element(page.getByRole('dialog')).toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Create trip' })).toBeInTheDocument();
  await expect.element(page.getByText('Add a new trip to your workspace.')).toBeInTheDocument();
  await expect.element(page.getByRole('textbox', { name: 'Trip name' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Create trip' })).toBeInTheDocument();
});

test('does not render dialog content when closed', async () => {
  await renderFormDialog({ open: false });
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
});

test('shows form errors and submits through the wrapped form', async () => {
  const { onSubmit } = await renderFormDialog({ error: 'Trip name is required' });

  expect(page.getByRole('alert').element().textContent).toBe('Trip name is required');

  await page.getByRole('button', { name: 'Create trip' }).click();
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('calls onClose from cancel and when the dialog closes', async () => {
  const { onClose } = await renderFormDialog();

  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(onClose).toHaveBeenCalledTimes(1);

  await page.getByRole('button', { name: 'Close' }).click();
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('disables actions while pending and shows a spinner on submit', async () => {
  await renderFormDialog({ isPending: true });

  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: /Create trip/ })).toBeDisabled();
  await expect.element(page.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
});

test('respects submitDisabled and custom layout class names', async () => {
  await renderFormDialog({
    contentClassName: 'max-w-xl',
    formClassName: 'space-y-8',
    submitDisabled: true
  });

  await expect.element(page.getByRole('button', { name: /Create trip/ })).toBeDisabled();
  await expect.element(page.getByRole('dialog')).toHaveClass('max-w-xl');
  expect(document.querySelector('form')?.className).toContain('space-y-8');
});
