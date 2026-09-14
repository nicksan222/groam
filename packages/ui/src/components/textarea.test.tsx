import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Textarea } from './textarea';

afterEach(cleanup);

test('renders a textarea with shared field styling', () => {
  render(<Textarea aria-label="Description" placeholder="Tell us more" />);

  const textarea = screen.getByRole('textbox', { name: 'Description' });
  expect(textarea.getAttribute('data-slot')).toBe('textarea');
  expect(textarea.getAttribute('placeholder')).toBe('Tell us more');
  expect(textarea.className).toContain('min-h-20');
  expect(textarea.className).toContain('resize-y');
  expect(textarea.className).toContain('focus-visible:ring-[3px]');
});

test('reflects disabled and invalid accessibility states in classes', () => {
  render(<Textarea aria-invalid aria-label="Feedback" disabled />);

  const textarea = screen.getByRole('textbox', { name: 'Feedback' });
  expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
  expect(textarea.getAttribute('aria-invalid')).toBe('true');
  expect(textarea.className).toContain('aria-invalid:border-destructive');
  expect(textarea.className).toContain('disabled:opacity-64');
});

test('merges custom class names and forwards controlled values', () => {
  render(<Textarea aria-label="Notes" className="min-h-40" defaultValue="Initial copy" />);

  const textarea = screen.getByRole('textbox', { name: 'Notes' });
  expect(textarea.className).toContain('min-h-40');
  expect((textarea as HTMLTextAreaElement).value).toBe('Initial copy');

  fireEvent.change(textarea, { target: { value: 'Revised copy' } });
  expect((textarea as HTMLTextAreaElement).value).toBe('Revised copy');
});
