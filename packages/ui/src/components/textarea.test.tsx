import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { Textarea } from './textarea';

test('renders a textarea with shared field styling', async () => {
  await render(<Textarea aria-label="Description" placeholder="Tell us more" />);

  const textarea = page.getByRole('textbox', { name: 'Description' }).element();
  expect(textarea.getAttribute('data-slot')).toBe('textarea');
  expect(textarea.getAttribute('placeholder')).toBe('Tell us more');
  expect(textarea.className).toContain('min-h-20');
  expect(textarea.className).toContain('resize-y');
  expect(textarea.className).toContain('focus-visible:ring-[3px]');
});

test('reflects disabled and invalid accessibility states in classes', async () => {
  await render(<Textarea aria-invalid aria-label="Feedback" disabled />);

  const textarea = page.getByRole('textbox', { name: 'Feedback' }).element();
  expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
  expect(textarea.getAttribute('aria-invalid')).toBe('true');
  expect(textarea.className).toContain('aria-invalid:border-destructive');
  expect(textarea.className).toContain('disabled:opacity-64');
});

test('merges custom class names and forwards controlled values', async () => {
  await render(<Textarea aria-label="Notes" className="min-h-40" defaultValue="Initial copy" />);

  const textarea = page.getByRole('textbox', { name: 'Notes' }).element();
  expect(textarea.className).toContain('min-h-40');
  expect((textarea as HTMLTextAreaElement).value).toBe('Initial copy');

  await userEvent.fill(textarea, 'Revised copy');
  expect((textarea as HTMLTextAreaElement).value).toBe('Revised copy');
});
