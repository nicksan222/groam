import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { FormFeedback } from './form-feedback';

afterEach(cleanup);

test('renders an alert for errors and status for success messages', () => {
  const { rerender } = render(<FormFeedback error="Something went wrong" />);
  expect(screen.getByRole('alert').textContent).toBe('Something went wrong');

  rerender(<FormFeedback message="Saved" />);
  expect(screen.getByRole('status').textContent).toBe('Saved');

  rerender(<FormFeedback />);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
});

test('prefers error feedback over success messages', () => {
  render(<FormFeedback error="Could not save" message="Saved" />);

  expect(screen.getByRole('alert').textContent).toBe('Could not save');
  expect(screen.queryByRole('status')).toBeNull();
});

test('applies semantic styling and custom class names for errors', () => {
  render(<FormFeedback className="mt-2" error="Something went wrong" />);

  const error = screen.getByRole('alert');
  expect(error.className).toContain('text-destructive');
  expect(error.className).toContain('mt-2');
});

test('applies semantic styling and custom class names for success messages', () => {
  render(<FormFeedback className="mt-2" message="Saved" />);

  const status = screen.getByRole('status');
  expect(status.className).toContain('text-emerald-600');
  expect(status.className).toContain('mt-2');
});

test('renders nothing for empty error and message values', () => {
  const { container } = render(<FormFeedback error={null} message={null} />);
  expect(container.firstChild).toBeNull();
});
