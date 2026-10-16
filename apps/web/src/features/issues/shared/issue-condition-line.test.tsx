import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IssueCondition } from '@/types/issues';
import { IssueConditionLine } from './issue-condition-line';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const manualCondition = (label = 'Flights confirmed') =>
  ({ kind: 'manual', label, met: null }) satisfies IssueCondition;

describe('IssueConditionLine', () => {
  test('says what is still needed while an automatic check is pending, with the full label as tooltip', async () => {
    await render(<IssueConditionLine condition={autoCondition(false)} />);
    await expect.element(page.getByText('Needs a destination')).toBeVisible();
    await expect.element(page.getByText('(not yet)')).toBeInTheDocument();
    await expect
      .element(page.getByTitle('Done when: The trip has a destination'))
      .toBeInTheDocument();
  });

  test.each([
    ['activities', 'Every destination has an activity', 'Needs an activity everywhere'],
    ['budget', 'The trip has a group budget', 'Needs a group budget'],
    ['packing', 'The packing list has items', 'Needs a packing list']
  ] as const)('words the pending %s check', async (check, label, wording) => {
    await render(
      <IssueConditionLine
        condition={{ check, kind: 'auto', label, met: false, refusal: 'Closes itself.' }}
      />
    );
    await expect.element(page.getByText(wording)).toBeVisible();
    await expect.element(page.getByTitle(`Done when: ${label}`)).toBeInTheDocument();
  });

  test('shows the label once the check is met', async () => {
    await render(<IssueConditionLine condition={autoCondition(true)} />);
    await expect.element(page.getByText('The trip has a destination')).toBeVisible();
    await expect.element(page.getByText('(met)')).toBeInTheDocument();
  });

  test('shows a manual condition as written and pending', async () => {
    await render(<IssueConditionLine condition={manualCondition('Visa sorted')} />);
    await expect.element(page.getByText('Visa sorted')).toBeVisible();
    await expect.element(page.getByText('(not yet)')).toBeInTheDocument();
  });
});
