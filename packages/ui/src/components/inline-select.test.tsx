import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { InlineSelect } from './inline-select';

const options = [
  { label: 'Any', value: 'any' },
  { label: 'All', value: 'all' }
] as const;

test('shows the selected option under an accessible label', async () => {
  await render(<InlineSelect label="Match" onChange={vi.fn()} options={options} value="all" />);

  const trigger = page.getByRole('combobox', { name: 'Match' });
  await expect.element(trigger).toHaveTextContent('All');
});

test('lists options and reports the chosen value', async () => {
  const onChange = vi.fn();
  await render(<InlineSelect label="Match" onChange={onChange} options={options} value="all" />);

  await page.getByRole('combobox', { name: 'Match' }).click();
  await expect.element(page.getByRole('option', { name: 'Any' })).toBeInTheDocument();
  await page.getByRole('option', { name: 'Any' }).click();
  expect(onChange).toHaveBeenCalledWith('any');
});

test('disables the trigger', async () => {
  await render(
    <InlineSelect disabled label="Match" onChange={vi.fn()} options={options} value="all" />
  );
  await expect.element(page.getByRole('combobox', { name: 'Match' })).toBeDisabled();
});

test('opens and picks an option from the keyboard', async () => {
  const onChange = vi.fn();
  await render(<InlineSelect label="Match" onChange={onChange} options={options} value="all" />);

  await userEvent.tab();
  await expect.element(page.getByRole('combobox', { name: 'Match' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('option', { name: 'All' })).toHaveFocus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(page.getByRole('option', { name: 'Any' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(onChange).toHaveBeenCalledWith('any');
});
