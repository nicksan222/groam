import { v } from 'convex/values';

export const TRIP_CURRENCIES = [
  'AED',
  'ARS',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MAD',
  'MXN',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'VND',
  'ZAR'
] as const;

export type TripCurrency = (typeof TRIP_CURRENCIES)[number];
export const DEFAULT_TRIP_CURRENCY = 'USD' satisfies TripCurrency;

const currencyLiterals = TRIP_CURRENCIES.map((code) => v.literal(code));

export const tripCurrencyValidator = v.union(
  ...(currencyLiterals as [
    (typeof currencyLiterals)[number],
    (typeof currencyLiterals)[number],
    ...(typeof currencyLiterals)[number][]
  ])
);
