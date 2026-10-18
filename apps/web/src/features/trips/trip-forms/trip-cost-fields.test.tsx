import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripCostSplit } from '@/features/trips/trip-forms/trip-cost';
import { TripCostFields } from './trip-cost-fields';

function renderFields(props: Partial<Parameters<typeof TripCostFields>[0]> = {}) {
  const onAmountChange = vi.fn();
  const onSplitChange = vi.fn();
  return {
    onAmountChange,
    onSplitChange,
    ready: render(
      <TripCostFields
        amount=""
        label="Estimated cost"
        onAmountChange={onAmountChange}
        onSplitChange={onSplitChange}
        split="total"
        {...props}
      />
    )
  };
}

describe('TripCostFields', () => {
  test.each<[TripCostSplit, string | undefined, string]>([
    ['total', undefined, 'Estimated cost for the group'],
    ['per_person', undefined, 'Estimated cost per person'],
    ['total', 'EUR', 'Estimated cost for the group (EUR)'],
    ['per_person', 'USD', 'Estimated cost per person (USD)']
  ])('labels the amount for %s in %s', async (split, currency, label) => {
    await renderFields({ currency, split }).ready;
    await expect.element(page.getByLabelText(label)).toBeVisible();
  });

  test('reports typed amounts', async () => {
    const { onAmountChange, ready } = renderFields();
    await ready;
    await page.getByLabelText('Estimated cost for the group').fill('125.5');
    expect(onAmountChange).toHaveBeenLastCalledWith('125.5');
  });

  test('shows the current amount and any error', async () => {
    await renderFields({ amount: '40', error: 'Cost must be zero or more.' }).ready;
    await expect.element(page.getByLabelText('Estimated cost for the group')).toHaveValue(40);
    await expect.element(page.getByText('Cost must be zero or more.')).toBeVisible();
  });

  test('shows the current split and reports a new one', async () => {
    const { onSplitChange, ready } = renderFields({ split: 'per_person' });
    await ready;
    const trigger = page.getByRole('combobox');
    await expect.poll(() => trigger.element().textContent).toContain('Per person');
    await trigger.click();
    await page.getByRole('option', { name: 'Total for the group' }).click();
    expect(onSplitChange).toHaveBeenCalledWith('total');
  });

  test('disables both controls', async () => {
    await renderFields({ disabled: true }).ready;
    await expect.element(page.getByLabelText('Estimated cost for the group')).toBeDisabled();
    await expect.element(page.getByRole('combobox')).toBeDisabled();
  });
});
