import { expect, test } from 'vitest';
import { buildWorkspaceSeedPlans } from './build-workspace-seed-plans';

test('builds one complete workspace plan per trip', () => {
  const plans = buildWorkspaceSeedPlans(20);
  expect(plans).toHaveLength(20);
  expect(new Set(plans.map(({ create }) => create.name)).size).toBe(20);
  expect(plans.some(({ proposal }) => proposal !== undefined)).toBe(true);
  expect(plans.some(({ archived }) => archived)).toBe(true);
  expect(plans.some(({ activities }) => activities.length > 2)).toBe(true);
});
