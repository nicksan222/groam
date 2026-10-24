import { expect, test } from 'vite-plus/test';
import { budgetSummary, plannedPerTravelerLabel } from './trip-budget-label';

const trip = (initialBudget: number | null, totalPlannedCost: number, currency = 'USD') => ({
  currency,
  initialBudget,
  totalPlannedCost
});

test.each([
  ['nothing planned and no budget', trip(null, 0), undefined],
  ['a plan without a budget', trip(null, 29_810), '$29,810 planned'],
  ['a plan under its budget', trip(62_400, 29_810), '$29,810 of $62,400 planned'],
  ['a plan over its budget', trip(100, 150), '$150 of $100 planned, over budget'],
  ['a budget with nothing planned yet', trip(500, 0), '$0 of $500 planned'],
  ['an amount with cents', trip(null, 10.5), '$10.50 planned']
])('writes %s', (_name, input, expected) => {
  expect(budgetSummary(input as never)).toBe(expected);
});

test.each([
  [
    'an even share',
    { currency: 'USD', totalPlannedCost: 3000, travelerCount: 2 },
    '≈ $1,500 planned per traveler'
  ],
  [
    'a share rounded to cents',
    { currency: 'USD', totalPlannedCost: 100, travelerCount: 3 },
    '≈ $33.33 planned per traveler'
  ],
  ['no planned cost', { currency: 'USD', totalPlannedCost: 0, travelerCount: 2 }, undefined],
  ['nobody going', { currency: 'USD', totalPlannedCost: 3000, travelerCount: 0 }, undefined]
])('writes the per-traveler line for %s', (_name, input, expected) => {
  expect(plannedPerTravelerLabel(input as never)).toBe(expected);
});
