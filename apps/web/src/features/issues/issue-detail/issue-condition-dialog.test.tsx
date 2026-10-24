import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ruleCondition } from '@/features/issues/issue-condition-fixtures';
import { testIds } from '@/lib/test-ids';
import { IssueConditionDialog } from './issue-condition-dialog';

const generate = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-generate-rule', () => ({ useGenerateRule: () => generate }));

function setup(onSave = vi.fn().mockResolvedValue(true)) {
  const onClose = vi.fn();
  return {
    onClose,
    onSave,
    ui: <IssueConditionDialog condition={ruleCondition()} onClose={onClose} onSave={onSave} open />
  };
}

describe('IssueConditionDialog', () => {
  test('renders the builder from the existing rule, with the magic input', async () => {
    await render(setup().ui);
    const dialog = page.getByTestId(testIds.issueConditionDialog);
    await expect.element(dialog.getByText('Done when')).toBeVisible();
    await expect.element(dialog.getByTestId(testIds.ruleMagicInput)).toBeVisible();
    await expect.element(dialog.getByTestId(testIds.ruleRemove)).toBeVisible();
  });

  test('saves the rule and closes on success', async () => {
    const { onClose, onSave, ui } = setup();
    await render(ui);
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      rule: { items: [{ kind: 'within_budget' }], match: 'all' }
    });
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  test('stays open when saving fails', async () => {
    const { onClose, onSave, ui } = setup(vi.fn().mockResolvedValue(false));
    await render(ui);
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('offers Remove rule once every row is gone and saves nothing', async () => {
    const { onSave, ui } = setup();
    await render(ui);
    await page.getByTestId(testIds.ruleRemove).first().click();
    await page.getByRole('button', { name: 'Remove rule' }).click();
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({});
  });
});
