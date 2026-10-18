import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DatePicker } from './date-picker';

test('renders a labeled trigger with placeholder copy', async () => {
  await render(<DatePicker label="Decide by" onChange={vi.fn()} />);

  const trigger = page.getByRole('button', { name: 'Decide by' }).element();
  expect(trigger.className).toContain('w-full');
  await expect.element(page.getByText('Choose a date')).toBeInTheDocument();
  expect(document.querySelector('[data-slot="date-picker"]')).toBeTruthy();
  expect(document.querySelector('input[type="date"]')).toBeNull();
});

test('shows the selected calendar date on the trigger', async () => {
  await render(<DatePicker label="Decide by" onChange={vi.fn()} value="2026-08-23" />);

  const shown = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(2026, 7, 23));
  await expect.element(page.getByText(shown)).toBeInTheDocument();
});

test('emits YYYY-MM-DD when a day is chosen', async () => {
  const onChange = vi.fn();
  await render(<DatePicker label="Decide by" onChange={onChange} value="2026-08-23" />);

  await page.getByRole('button', { name: 'Decide by' }).click();
  await page.getByRole('button', { name: /August 24/u }).click();

  expect(onChange).toHaveBeenCalledWith('2026-08-24');
  expect(document.querySelector('[data-slot="calendar"]')).toBeNull();
});

test('clears an optional date', async () => {
  const onChange = vi.fn();
  await render(<DatePicker label="Decide by" onChange={onChange} value="2026-08-23" />);

  await page.getByRole('button', { name: 'Decide by' }).click();
  await page.getByRole('button', { name: 'Clear date' }).click();
  expect(onChange).toHaveBeenCalledWith(null);
});

test('disables the trigger when pending', async () => {
  await render(<DatePicker disabled label="Decide by" onChange={vi.fn()} />);
  await expect.element(page.getByRole('button', { name: 'Decide by' })).toBeDisabled();
});
