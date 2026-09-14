import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { stubPopoverEnvironment } from '#src/lib/stub-popover-environment';
import { DatePicker } from './date-picker';

afterEach(cleanup);

test('renders a labeled trigger with placeholder copy', () => {
  render(<DatePicker label="Decide by" onChange={vi.fn()} />);

  const trigger = screen.getByRole('button', { name: 'Decide by' });
  expect(trigger.className).toContain('w-full');
  expect(screen.getByText('Choose a date')).toBeTruthy();
  expect(document.querySelector('[data-slot="date-picker"]')).toBeTruthy();
  expect(document.querySelector('input[type="date"]')).toBeNull();
});

test('shows the selected calendar date on the trigger', () => {
  render(<DatePicker label="Decide by" onChange={vi.fn()} value="2026-08-23" />);

  const shown = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(2026, 7, 23));
  expect(screen.getByText(shown)).toBeTruthy();
});

test('emits YYYY-MM-DD when a day is chosen', () => {
  stubPopoverEnvironment();
  const onChange = vi.fn();
  render(<DatePicker label="Decide by" onChange={onChange} value="2026-08-23" />);

  fireEvent.click(screen.getByRole('button', { name: 'Decide by' }));
  const next = new Date(2026, 7, 24);
  const day = document.querySelector(
    `[data-slot="calendar"] [data-day="${next.toLocaleDateString()}"]`
  );
  expect(day).toBeTruthy();
  fireEvent.click(day as Element);

  expect(onChange).toHaveBeenCalledWith('2026-08-24');
  expect(document.querySelector('[data-slot="calendar"]')).toBeNull();
});

test('clears an optional date', () => {
  stubPopoverEnvironment();
  const onChange = vi.fn();
  render(<DatePicker label="Decide by" onChange={onChange} value="2026-08-23" />);

  fireEvent.click(screen.getByRole('button', { name: 'Decide by' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
  expect(onChange).toHaveBeenCalledWith(null);
});

test('disables the trigger when pending', () => {
  render(<DatePicker disabled label="Decide by" onChange={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Decide by' }) as HTMLButtonElement).disabled).toBe(
    true
  );
});
