import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripCurrencySelect } from './trip-currency-select';

describe('TripCurrencySelect', () => {
  test.each(['EUR', 'USD'] as const)('shows the selected currency %s', async (value) => {
    await render(<TripCurrencySelect onChange={vi.fn()} value={value} />);
    await expect.poll(() => page.getByRole('combobox').element().textContent).toContain(value);
  });

  test('reports a newly chosen currency', async () => {
    const onChange = vi.fn();
    await render(<TripCurrencySelect onChange={onChange} value="EUR" />);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /^USD/u }).click();
    expect(onChange).toHaveBeenCalledWith('USD');
  });

  test('can be disabled', async () => {
    await render(<TripCurrencySelect disabled onChange={vi.fn()} value="EUR" />);
    await expect.element(page.getByRole('combobox')).toBeDisabled();
  });

  test('forwards the id to the trigger', async () => {
    await render(<TripCurrencySelect id="currency" onChange={vi.fn()} value="EUR" />);
    await expect.element(page.getByRole('combobox')).toHaveAttribute('id', 'currency');
  });
});
