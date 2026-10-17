import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  manualCondition,
  ruleCondition,
  starterCondition
} from '@/features/issues/issue-condition-fixtures';
import { IssueConditionLine } from './issue-condition-line';

describe('IssueConditionLine', () => {
  test('says what is missing while a one-clause rule is pending, with the full label as tooltip', async () => {
    await render(<IssueConditionLine condition={starterCondition(false)} />);
    await expect.element(page.getByText('No destination yet')).toBeVisible();
    await expect.element(page.getByText('(not yet)')).toBeInTheDocument();
    await expect
      .element(page.getByTitle('Done when: The trip has a destination'))
      .toBeInTheDocument();
  });

  test('shows the label of a pending rule with several clauses', async () => {
    const label = 'Every day has at least 1 activity and the trip has a group budget';
    const pending = starterCondition(false);
    await render(
      <IssueConditionLine
        condition={{
          ...pending,
          items: [
            { detail: 'Short on days 2, 3', kind: 'clause', label: 'Every day has…', met: false },
            { detail: 'No budget yet', kind: 'clause', label: 'The trip has…', met: false }
          ],
          label
        }}
      />
    );
    await expect.element(page.getByText(label)).toBeVisible();
  });

  test('shows the label once the check is met', async () => {
    await render(<IssueConditionLine condition={starterCondition(true)} />);
    await expect.element(page.getByText('The trip has a destination')).toBeVisible();
    await expect.element(page.getByText('(met)')).toBeInTheDocument();
  });

  test('shows a manual condition as written and pending', async () => {
    await render(<IssueConditionLine condition={manualCondition('Visa sorted')} />);
    await expect.element(page.getByText('Visa sorted')).toBeVisible();
    await expect.element(page.getByText('(not yet)')).toBeInTheDocument();
    expect(document.querySelector('svg.lucide-pen-line')).not.toBeNull();
  });

  test('flags a pending rule rather than marking it hand-written', async () => {
    await render(<IssueConditionLine condition={starterCondition(false)} />);
    expect(document.querySelector('svg.lucide-flag')).not.toBeNull();
    expect(document.querySelector('svg.lucide-pen-line')).toBeNull();
  });

  test('shows the label, not a detail, for a met one-clause rule', async () => {
    await render(<IssueConditionLine condition={ruleCondition(true)} />);
    await expect.element(page.getByText('Planned costs fit the budget')).toBeVisible();
  });
});
