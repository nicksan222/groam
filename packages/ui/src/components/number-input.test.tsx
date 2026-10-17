import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { NumberInput } from './number-input';

test('renders the value with numeric input mode and step', async () => {
  await render(<NumberInput label="Days" onChange={vi.fn()} step={0.5} value={3} />);

  const input = page.getByRole('spinbutton', { name: 'Days' });
  await expect.element(input).toHaveValue(3);
  await expect.element(input).toHaveAttribute('inputmode', 'decimal');
  await expect.element(input).toHaveAttribute('step', '0.5');
});

test('renders NaN as an empty box and reports NaN when cleared', async () => {
  const onChange = vi.fn();
  await render(<NumberInput label="Days" onChange={onChange} value={Number.NaN} />);

  const input = page.getByRole('spinbutton', { name: 'Days' });
  await expect.element(input).toHaveValue(null);
  await userEvent.type(input, '7');
  expect(onChange).toHaveBeenLastCalledWith(7);
});

test('reports NaN on empty input', async () => {
  const onChange = vi.fn();
  await render(<NumberInput label="Days" onChange={onChange} value={4} />);

  await userEvent.clear(page.getByRole('spinbutton', { name: 'Days' }));
  expect(onChange).toHaveBeenLastCalledWith(Number.NaN);
});

test('defaults to a whole-number keypad with a zero floor', async () => {
  await render(<NumberInput label="Days" onChange={vi.fn()} value={2} />);

  const input = page.getByRole('spinbutton', { name: 'Days' });
  await expect.element(input).toHaveAttribute('inputmode', 'numeric');
  await expect.element(input).toHaveAttribute('min', '0');
  await expect.element(input).not.toHaveAttribute('max');
});

test('clamps an out-of-range value to the bounds on blur', async () => {
  const onChange = vi.fn();
  const { rerender } = await render(
    <NumberInput label="Days" max={10} min={1} onChange={onChange} value={42} />
  );

  const input = page.getByRole('spinbutton', { name: 'Days' });
  await expect.element(input).toHaveAttribute('max', '10');
  await userEvent.click(input);
  await userEvent.tab();
  expect(onChange).toHaveBeenLastCalledWith(10);

  await rerender(<NumberInput label="Days" max={10} min={1} onChange={onChange} value={-3} />);
  await userEvent.click(input);
  await userEvent.tab();
  expect(onChange).toHaveBeenLastCalledWith(1);
});

test('leaves in-range and empty values alone on blur', async () => {
  const onChange = vi.fn();
  const { rerender } = await render(
    <NumberInput label="Days" max={10} onChange={onChange} value={5} />
  );

  const input = page.getByRole('spinbutton', { name: 'Days' });
  await userEvent.click(input);
  await userEvent.tab();
  await rerender(<NumberInput label="Days" max={10} onChange={onChange} value={Number.NaN} />);
  await userEvent.click(input);
  await userEvent.tab();
  expect(onChange).not.toHaveBeenCalled();
});

test('disables the box', async () => {
  await render(<NumberInput disabled label="Days" onChange={vi.fn()} value={1} />);
  await expect.element(page.getByRole('spinbutton', { name: 'Days' })).toBeDisabled();
});
