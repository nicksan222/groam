import type { TripCurrency } from '#convex/modules/travel/trips/currencies';

/** Nominal local fixture price scales, not exchange rates or current market estimates. */
const fixturePriceScales: Record<TripCurrency, number> = {
  AED: 4,
  ARS: 1200,
  AUD: 2,
  BRL: 6,
  CAD: 2,
  CHF: 1,
  CLP: 1000,
  CNY: 8,
  COP: 4500,
  CZK: 25,
  DKK: 8,
  EGP: 55,
  EUR: 1,
  GBP: 1,
  HKD: 9,
  HUF: 400,
  IDR: 17000,
  ILS: 4,
  INR: 90,
  ISK: 150,
  JPY: 160,
  KRW: 1500,
  MAD: 11,
  MXN: 22,
  NOK: 12,
  NZD: 2,
  PHP: 65,
  PLN: 5,
  SEK: 12,
  SGD: 2,
  THB: 40,
  TRY: 45,
  USD: 1,
  VND: 28000,
  ZAR: 22
};

export function fixtureMoney(amount: number, currency: TripCurrency): number {
  return Math.round(amount * fixturePriceScales[currency]);
}
