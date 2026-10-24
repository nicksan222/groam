import { clauseLabel } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { RuleClause } from '@/types/issues';
import { RuleClauseRow } from './rule-clause-row';

const clause: RuleClause = { count: 2, kind: 'daily_activities' };

function setup(props: Partial<Parameters<typeof RuleClauseRow>[0]> = {}) {
  const handlers = { onChange: vi.fn(), onChangeKind: vi.fn(), onRemove: vi.fn() };
  return {
    ...handlers,
    mount: () =>
      render(
        <ul>
          <RuleClauseRow clause={clause} joiner="When" {...handlers} {...props} />
        </ul>
      )
  };
}

describe('RuleClauseRow', () => {
  test('renders the joiner, kind select, settings and saved sentence', async () => {
    await setup().mount();
    await expect.element(page.getByText('When', { exact: true })).toBeVisible();
    await expect.element(page.getByLabelText('Condition')).toBeVisible();
    await expect.element(page.getByLabelText('Activities per day')).toHaveValue(2);
    await expect.element(page.getByText(clauseLabel(clause), { exact: true })).toBeVisible();
  });

  test('removes the condition', async () => {
    const { mount, onRemove } = setup();
    await mount();
    await page.getByRole('button', { name: 'Remove condition' }).click();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test('changes the kind', async () => {
    const { mount, onChangeKind } = setup();
    await mount();
    await page.getByLabelText('Condition').click();
    await page.getByRole('option').first().click();
    expect(onChangeKind).toHaveBeenCalledOnce();
  });

  test('edits a setting', async () => {
    const { mount, onChange } = setup();
    await mount();
    await page.getByLabelText('Activities per day').fill('4');
    expect(onChange).toHaveBeenLastCalledWith({ ...clause, count: 4 });
  });

  test('disabled locks every control', async () => {
    await setup({ disabled: true }).mount();
    await expect.element(page.getByLabelText('Condition')).toBeDisabled();
    await expect.element(page.getByLabelText('Activities per day')).toBeDisabled();
    await expect.element(page.getByTestId(testIds.ruleRemove)).toBeDisabled();
  });
});
