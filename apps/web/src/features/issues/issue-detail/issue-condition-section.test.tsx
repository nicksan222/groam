import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  manualCondition,
  ruleCondition,
  starterCondition
} from '@/features/issues/issue-condition-fixtures';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition } from '@/types/issues';
import { IssueConditionSection } from './issue-condition-section';

const unmetStarter = starterCondition(false);
const metStarter = starterCondition(true);
const manual = manualCondition();
const rule = {
  items: [
    { detail: null, kind: 'clause', label: 'Planned costs fit the budget', met: true },
    {
      clauses: [
        { detail: 'None yet', label: 'Getting there is planned', met: false },
        { detail: '1 going so far', label: 'At least 2 travelers are going', met: false }
      ],
      kind: 'group',
      label: 'Getting there is planned or at least 2 travelers are going',
      match: 'any',
      met: false
    }
  ],
  kind: 'rule',
  label: 'Planned costs fit the budget and (getting there has a transfer or …)',
  match: 'all',
  met: false,
  refusal: 'This closes itself once the trip meets its rule.',
  starter: false,
  rule: {
    items: [
      { kind: 'within_budget' },
      {
        clauses: [
          { boundary: 'arrival', kind: 'boundary_transfer' },
          { count: 2, kind: 'travelers_going' }
        ],
        kind: 'group',
        match: 'any'
      }
    ],
    match: 'all'
  }
} satisfies IssueCondition;

const generate = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-generate-rule', () => ({ useGenerateRule: () => generate }));

describe('IssueConditionSection', () => {
  test('renders nothing without a condition', async () => {
    await render(<IssueConditionSection condition={null} />);
    await expect.element(page.getByText('Done when')).not.toBeInTheDocument();
  });

  test.each<[string, IssueCondition, string, string | null]>([
    ['an unmet auto condition', unmetStarter, 'Not met yet', 'false'],
    ['a met auto condition', metStarter, 'Met. It stays Done', 'true'],
    ['a manual condition', manual, '', null]
  ])('shows %s', async (_, condition, hint, met) => {
    await render(<IssueConditionSection condition={condition} />);
    await expect.element(page.getByText('Done when')).toBeVisible();
    await expect.element(page.getByText(condition.label)).toBeVisible();
    const panel = page.getByTestId(testIds.issueConditionPanel);
    if (met === null) await expect.element(panel).not.toHaveAttribute('data-met');
    else await expect.element(panel).toHaveAttribute('data-met', met);
    if (hint) await expect.element(page.getByText(hint, { exact: false })).toBeVisible();
    else await expect.element(panel.getByText(/Met\.|Not met/u)).not.toBeInTheDocument();
  });

  test('checks a rule clause by clause, groups included', async () => {
    await render(<IssueConditionSection condition={rule} />);
    const panel = page.getByTestId(testIds.issueConditionPanel);
    await expect.element(panel).toHaveAttribute('data-met', 'false');
    await expect.element(panel.getByText('All of these:')).toBeVisible();
    await expect.element(panel.getByText('Any of these:')).toBeVisible();
    await expect.element(panel.getByText('None yet')).toBeVisible();
    const items = page.getByTestId(testIds.issueConditionItem);
    await expect.element(items.nth(0)).toHaveAttribute('data-met', 'true');
    await expect.element(items.nth(1)).toHaveAttribute('data-met', 'false');
    await expect.element(page.getByText('Not met yet', { exact: false })).toBeVisible();
  });

  test('hides editing from people who cannot manage the issue', async () => {
    const onSave = vi.fn();
    await render(<IssueConditionSection condition={manual} onSave={onSave} />);
    await expect.element(page.getByTestId(testIds.issueEditCondition)).not.toBeInTheDocument();
  });

  test.each<[string, IssueCondition]>([
    ['their own rule', ruleCondition()],
    ['a starter', unmetStarter]
  ])('lets people edit %s', async (_, condition) => {
    await render(<IssueConditionSection canEdit condition={condition} onSave={vi.fn()} />);
    await expect.element(page.getByTestId(testIds.issueEditCondition)).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Edit rule' })).toBeVisible();
  });

  test('opens a starter in the rule builder and saves it as a rule', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    await render(<IssueConditionSection canEdit condition={unmetStarter} onSave={onSave} />);
    await page.getByTestId(testIds.issueEditCondition).click();
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      rule: { items: [expect.objectContaining({ kind: 'has_destination' })], match: 'all' }
    });
  });

  test.each<[string, IssueCondition | null]>([
    ['no condition', null],
    ['a written condition', manual]
  ])('offers to build a rule for %s', async (_, condition) => {
    await render(<IssueConditionSection canEdit condition={condition} onSave={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Build rule' })).toBeVisible();
  });

  test('offers to add a condition when there is none', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    await render(<IssueConditionSection canEdit condition={null} onSave={onSave} />);
    await expect.element(page.getByText('No rule yet', { exact: false })).toBeVisible();
    await page.getByTestId(testIds.issueEditCondition).click();
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      rule: { items: [expect.objectContaining({ kind: 'daily_activities' })], match: 'all' }
    });
    await expect.element(page.getByTestId(testIds.issueConditionDialog)).not.toBeInTheDocument();
  });

  test('edits an existing rule and saves the change', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    await render(<IssueConditionSection canEdit condition={rule} onSave={onSave} />);
    await page.getByTestId(testIds.issueEditCondition).click();
    const dialog = page.getByTestId(testIds.issueConditionDialog);
    await expect.element(dialog.getByTestId(testIds.ruleGroup)).toBeVisible();
    await dialog.getByLabelText('Rule match').click();
    await page.getByRole('option', { name: 'any' }).click();
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({ rule: { ...rule.rule, match: 'any' } });
  });

  test('removes the rule once every row is gone', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    await render(<IssueConditionSection canEdit condition={rule} onSave={onSave} />);
    await page.getByTestId(testIds.issueEditCondition).click();
    await page.getByTestId(testIds.ruleRemove).first().click();
    await page.getByRole('button', { name: 'Remove group' }).click();
    await page.getByRole('button', { name: 'Remove rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({});
  });

  test('replaces a written condition with a rule', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    await render(<IssueConditionSection canEdit condition={manual} onSave={onSave} />);
    await page.getByTestId(testIds.issueEditCondition).click();
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ rule: { match: 'all' } });
  });
});
