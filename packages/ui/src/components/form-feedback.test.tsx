import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormFeedback } from './form-feedback';

test('renders an alert for errors and status for success messages', async () => {
  const { rerender } = await render(<FormFeedback error="Something went wrong" />);
  expect(page.getByRole('alert').element().textContent).toBe('Something went wrong');

  await rerender(<FormFeedback message="Saved" />);
  expect(page.getByRole('status').element().textContent).toBe('Saved');

  await rerender(<FormFeedback />);
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  await expect.element(page.getByRole('status')).not.toBeInTheDocument();
});

test('prefers error feedback over success messages', async () => {
  await render(<FormFeedback error="Could not save" message="Saved" />);

  expect(page.getByRole('alert').element().textContent).toBe('Could not save');
  await expect.element(page.getByRole('status')).not.toBeInTheDocument();
});

test('applies semantic styling and custom class names for errors', async () => {
  await render(<FormFeedback className="mt-2" error="Something went wrong" />);

  const error = page.getByRole('alert').element();
  expect(error.className).toContain('text-destructive');
  expect(error.className).toContain('mt-2');
});

test('applies semantic styling and custom class names for success messages', async () => {
  await render(<FormFeedback className="mt-2" message="Saved" />);

  const status = page.getByRole('status').element();
  expect(status.className).toContain('text-emerald-600');
  expect(status.className).toContain('mt-2');
});

test('renders nothing for empty error and message values', async () => {
  const { container } = await render(<FormFeedback error={null} message={null} />);
  expect(container.firstChild).toBeNull();
});
