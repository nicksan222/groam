import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  manualCondition,
  ruleCondition,
  starterCondition
} from '@/features/issues/issue-condition-fixtures';
import { testIds } from '@/lib/test-ids';
import { IssueConditionSummary } from './issue-condition-summary';

describe('IssueConditionSummary', () => {
  test('shows a written condition with its label and no met hint', async () => {
    await render(<IssueConditionSummary condition={manualCondition('Flights confirmed')} />);
    const panel = page.getByTestId(testIds.issueConditionPanel);
    await expect.element(panel.getByText('Flights confirmed')).toBeVisible();
    await expect.element(panel).not.toHaveAttribute('data-met');
    await expect.element(panel.getByText(/Met\.|Not met/u)).not.toBeInTheDocument();
    expect(panel.element().querySelector('.lucide-pen-line')).not.toBeNull();
  });

  test('says an unmet rule is not met yet', async () => {
    await render(<IssueConditionSummary condition={starterCondition(false)} />);
    const panel = page.getByTestId(testIds.issueConditionPanel);
    await expect.element(panel).toHaveAttribute('data-met', 'false');
    await expect.element(panel.getByText('Not met yet', { exact: false })).toBeVisible();
    expect(panel.element().querySelector('.lucide-flag')).not.toBeNull();
  });

  test('says a met rule stays Done', async () => {
    await render(<IssueConditionSummary condition={ruleCondition(true)} />);
    const panel = page.getByTestId(testIds.issueConditionPanel);
    await expect.element(panel).toHaveAttribute('data-met', 'true');
    await expect.element(panel.getByText('Met. It stays Done', { exact: false })).toBeVisible();
    expect(panel.element().querySelector('.lucide-circle-check')).not.toBeNull();
  });

  test('renders the rule breakdown for a rule', async () => {
    await render(
      <IssueConditionSummary
        condition={{
          ...ruleCondition(false),
          items: [
            { detail: 'Over by 10', kind: 'clause', label: 'Costs fit', met: false },
            { detail: null, kind: 'clause', label: 'Has destination', met: true }
          ]
        }}
      />
    );
    await expect.element(page.getByText('All of these:')).toBeVisible();
    await expect.element(page.getByTestId(testIds.issueConditionItem).first()).toBeVisible();
  });
});
