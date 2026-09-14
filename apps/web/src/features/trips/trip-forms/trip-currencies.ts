import {
  DEFAULT_TRIP_CURRENCY,
  TRIP_CURRENCIES,
  type TripCurrency
} from '@groam/backend/convex/modules/travel/trips/currencies';

export { DEFAULT_TRIP_CURRENCY, TRIP_CURRENCIES, type TripCurrency };

const currencyNames = new Intl.DisplayNames(undefined, { type: 'currency' });
const tripCostFormatters = new Map<string, Intl.NumberFormat>();

export function tripCurrencyLabel(code: TripCurrency): string {
  const name = currencyNames.of(code);
  return name ? `${code} · ${name}` : code;
}

export function formatTripCost(amount: number, currency: string): string {
  let formatter = tripCostFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: 2,
      style: 'currency'
    });
    tripCostFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function tripCurrency(value: string): TripCurrency | undefined {
  return TRIP_CURRENCIES.find((currency) => currency === value);
}
