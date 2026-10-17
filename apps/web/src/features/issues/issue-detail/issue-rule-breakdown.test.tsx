import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ruleCondition, starterCondition } from '@/features/issues/issue-condition-fixtures';
import { testIds } from '@/lib/test-ids';
import type { PresentedIssueRule } from '@/types/issues';
import { IssueRuleBreakdown } from './issue-rule-breakdown';

const multi: PresentedIssueRule = {
  ...ruleCondition(false),
  items: [
    { detail: null, kind: 'clause', label: 'Costs fit', met: true },
    { detail: 'No destination yet', kind: 'clause', label: 'Has destination', met: false },
    {
      clauses: [
        { detail: 'None yet', label: 'Transfer planned', met: false },
        { detail: null, label: 'Two going', met: true }
      ],
      kind: 'group',
      label: 'Transfer or two going',
      match: 'any',
      met: true
    }
  ]
};

describe('IssueRuleBreakdown', () => {
  test('shows only the detail of a one-clause rule', async () => {
    await render(<IssueRuleBreakdown rule={starterCondition(false)} />);
    await expect.element(page.getByText('No destination yet')).toBeVisible();
    await expect.element(page.getByText('All of these:')).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.issueConditionItem)).not.toBeInTheDocument();
  });

  test('shows nothing for a met one-clause rule', async () => {
    const { container } = await render(<IssueRuleBreakdown rule={starterCondition(true)} />);
    expect(container.textContent).toBe('');
  });

  test('lists every clause with its met state, details only while unmet', async () => {
    await render(<IssueRuleBreakdown rule={multi} />);
    await expect.element(page.getByText('All of these:')).toBeVisible();
    const items = page.getByTestId(testIds.issueConditionItem);
    await expect.element(items.nth(0)).toHaveAttribute('data-met', 'true');
    await expect.element(items.nth(0).getByText('Costs fit')).toBeVisible();
    await expect.element(items.nth(0).getByText('(met)')).toBeInTheDocument();
    await expect.element(items.nth(1)).toHaveAttribute('data-met', 'false');
    await expect.element(items.nth(1).getByText('No destination yet')).toBeVisible();
    await expect.element(items.nth(1).getByText('(not yet)')).toBeInTheDocument();
  });

  test('nests the clauses of a group under its match word', async () => {
    await render(<IssueRuleBreakdown rule={multi} />);
    await expect.element(page.getByText('Any of these:')).toBeVisible();
    const items = page.getByTestId(testIds.issueConditionItem);
    await expect.element(items).toHaveLength(4);
    await expect.element(items.nth(2).getByText('Transfer planned')).toBeVisible();
    await expect.element(items.nth(3)).toHaveAttribute('data-met', 'true');
    await expect.element(items.nth(3).getByText('None yet')).not.toBeInTheDocument();
  });

  test('tells screen readers whether a group holds', async () => {
    await render(<IssueRuleBreakdown rule={multi} />);
    const group = page.getByText('Any of these:').element().parentElement;
    expect(group?.textContent).toContain('(met)');
  });
});
