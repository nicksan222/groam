import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { FormDialog } from './form-dialog';

afterEach(cleanup);

function renderFormDialog(props: Partial<ComponentProps<typeof FormDialog>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn((event) => event.preventDefault());

  render(
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

test('renders dialog metadata, children, and action buttons when open', () => {
  renderFormDialog();

  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Create trip' })).toBeTruthy();
  expect(screen.getByText('Add a new trip to your workspace.')).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Trip name' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create trip' })).toBeTruthy();
});

test('does not render dialog content when closed', () => {
  renderFormDialog({ open: false });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('shows form errors and submits through the wrapped form', () => {
  const { onSubmit } = renderFormDialog({ error: 'Trip name is required' });

  expect(screen.getByRole('alert').textContent).toBe('Trip name is required');

  fireEvent.click(screen.getByRole('button', { name: 'Create trip' }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('calls onClose from cancel and when the dialog closes', () => {
  const { onClose } = renderFormDialog();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('disables actions while pending and shows a spinner on submit', () => {
  renderFormDialog({ isPending: true });

  expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: /Create trip/ }) as HTMLButtonElement).disabled).toBe(
    true
  );
  expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
});

test('respects submitDisabled and custom layout class names', () => {
  renderFormDialog({
    contentClassName: 'max-w-xl',
    formClassName: 'space-y-8',
    submitDisabled: true
  });

  expect((screen.getByRole('button', { name: /Create trip/ }) as HTMLButtonElement).disabled).toBe(
    true
  );
  expect(screen.getByRole('dialog').className).toContain('max-w-xl');
  expect(document.querySelector('form')?.className).toContain('space-y-8');
});
