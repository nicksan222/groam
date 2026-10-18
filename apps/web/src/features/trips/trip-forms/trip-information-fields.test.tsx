import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripInformationFormState } from '@/types/trips';
import { TripInformationFields } from './trip-information-fields';

vi.mock('@/features/trips/hooks/use-trip-destination-search', () => ({
  useTripDestinationSearch: () => ({
    closeAndClear: vi.fn(),
    error: null,
    isLoading: false,
    isOpen: false,
    onOpenChange: vi.fn(),
    open: vi.fn(),
    query: '',
    results: [],
    setQuery: vi.fn()
  })
}));

function makeValue(overrides: Partial<TripInformationFormState> = {}): TripInformationFormState {
  return {
    budget: '',
    currency: 'EUR',
    dateNotes: '',
    destination: null,
    destinationStatus: 'undecided',
    name: '',
    startDate: '',
    totalDuration: '',
    ...overrides
  };
}

function renderFields(value: TripInformationFormState = makeValue(), { disabled = false } = {}) {
  const setValue = vi.fn();
  return {
    ready: render(<TripInformationFields disabled={disabled} setValue={setValue} value={value} />),
    setValue
  };
}

describe('TripInformationFields', () => {
  test('requires a trip name and shows the current one', async () => {
    await renderFields(makeValue({ name: 'Lisbon weekend' })).ready;
    const name = page.getByLabelText(/Trip name/u);
    await expect.element(name).toHaveValue('Lisbon weekend');
    await expect.element(name).toBeRequired();
  });

  test.each([
    ['Trip name', 'name', 'Porto'],
    ['Start date', 'startDate', '2026-09-01'],
    ['Length (days)', 'totalDuration', '7'],
    ['If dates are still open', 'dateNotes', 'Late July'],
    ['Total group budget', 'budget', '2500']
  ])('writes %s into %s', async (label, field, text) => {
    const { ready, setValue } = renderFields();
    await ready;
    await page.getByText(/Add dates and budget/u).click();
    await page.getByLabelText(new RegExp(label.replace(/[()]/gu, '\\$&'), 'u')).fill(text);
    expect(setValue).toHaveBeenLastCalledWith(field, text);
  });

  test('keeps dates and budget collapsed until opened', async () => {
    await renderFields().ready;
    await expect.element(page.getByLabelText(/Start date/u)).not.toBeVisible();
    await page.getByText(/Add dates and budget/u).click();
    await expect.element(page.getByLabelText(/Start date/u)).toBeVisible();
  });

  test('changes the default currency', async () => {
    const { ready, setValue } = renderFields();
    await ready;
    await page.getByText(/Add dates and budget/u).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /^USD/u }).click();
    expect(setValue).toHaveBeenCalledWith('currency', 'USD');
  });

  test.each([
    ['undecided', makeValue(), 'Keep the destination open'],
    [
      'a known place',
      makeValue({
        destination: {
          context: 'Portugal',
          countryCode: 'PT',
          latitude: 38.72,
          longitude: -9.14,
          name: 'Lisbon',
          placeId: 'osm:1',
          type: 'City'
        },
        destinationStatus: 'known'
      }),
      'Lisbon'
    ]
  ])('summarises %s destination', async (_, value, text) => {
    await renderFields(value).ready;
    await expect
      .poll(() => page.getByRole('button', { name: 'Destination' }).element().textContent)
      .toContain(text);
  });

  test('disables every field', async () => {
    await renderFields(makeValue(), { disabled: true }).ready;
    await page.getByText(/Add dates and budget/u).click();
    for (const label of [
      'Trip name',
      'Start date',
      'Length (days)',
      'If dates are still open',
      'Total group budget'
    ])
      await expect
        .element(page.getByLabelText(new RegExp(label.replace(/[()]/gu, '\\$&'), 'u')))
        .toBeDisabled();
    await expect.element(page.getByRole('combobox')).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Destination' })).toBeDisabled();
  });
});
