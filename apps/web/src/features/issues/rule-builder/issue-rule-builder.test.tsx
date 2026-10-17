import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { RuleDraft } from '@/types/issues';
import { IssueRuleBuilder } from './issue-rule-builder';
import { draftFromRule, ruleFromDraft } from './rule-draft';

function Harness({ initial, onRule }: { initial: RuleDraft; onRule: (draft: RuleDraft) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <IssueRuleBuilder
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onRule(next);
      }}
    />
  );
}

const lastRule = (onRule: ReturnType<typeof vi.fn>) =>
  ruleFromDraft(onRule.mock.lastCall?.[0] as RuleDraft);

describe('IssueRuleBuilder', () => {
  test('shows an empty state and adds a first condition', async () => {
    const onRule = vi.fn();
    await render(<Harness initial={{ items: [], match: 'all' }} onRule={onRule} />);
    await expect.element(page.getByText('No rule yet')).toBeVisible();
    await page.getByTestId(testIds.ruleAddCondition).click();
    await expect.element(page.getByTestId(testIds.ruleClause)).toBeVisible();
    await expect
      .element(
        page
          .getByTestId(testIds.rulePreview)
          .getByText('every day has at least 1 activity', { exact: false })
      )
      .toBeVisible();
  });

  test('switches a row to another kind and tunes its fields', async () => {
    const onRule = vi.fn();
    await render(
      <Harness
        initial={draftFromRule({ items: [{ kind: 'within_budget' }], match: 'all' })}
        onRule={onRule}
      />
    );
    await page.getByTestId(testIds.ruleClauseKind).click();
    await page.getByRole('option', { name: 'Travelers going' }).click();
    await page.getByLabelText('Travelers going').fill('4');
    expect(lastRule(onRule).items[0]).toEqual({ count: 4, kind: 'travelers_going' });
    await expect
      .element(
        page
          .getByTestId(testIds.rulePreview)
          .getByText('at least 4 travelers are going', { exact: false })
      )
      .toBeVisible();
  });

  test('joins rows with any and nests a group with its own match', async () => {
    const onRule = vi.fn();
    await render(
      <Harness
        initial={draftFromRule({ items: [{ kind: 'within_budget' }], match: 'all' })}
        onRule={onRule}
      />
    );
    await page.getByLabelText('Rule match').click();
    await page.getByRole('option', { name: 'any' }).click();
    await page.getByTestId(testIds.ruleAddGroup).click();
    await page.getByLabelText('Group match').click();
    await page.getByRole('option', { name: 'none' }).click();
    expect(lastRule(onRule)).toMatchObject({
      items: [{ kind: 'within_budget' }, { kind: 'group', match: 'none' }],
      match: 'any'
    });
    await page.getByRole('button', { name: 'Remove group' }).click();
    await expect.element(page.getByTestId(testIds.ruleGroup)).not.toBeInTheDocument();
  });

  test('removes a row', async () => {
    const onRule = vi.fn();
    await render(
      <Harness
        initial={draftFromRule({
          items: [{ kind: 'within_budget' }, { kind: 'legs_covered' }],
          match: 'all'
        })}
        onRule={onRule}
      />
    );
    await page.getByTestId(testIds.ruleRemove).first().click();
    expect(lastRule(onRule).items).toEqual([{ kind: 'legs_covered' }]);
  });

  test('replaces the rows with a drafted rule, and keeps them when drafting fails', async () => {
    const onRule = vi.fn();
    const generate = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ items: [{ kind: 'legs_covered' }], match: 'any' });
    function WithMagic() {
      const [draft, setDraft] = useState(
        draftFromRule({ items: [{ kind: 'within_budget' }], match: 'all' })
      );
      return (
        <IssueRuleBuilder
          draft={draft}
          generate={generate}
          onChange={(next) => {
            setDraft(next);
            onRule(next);
          }}
        />
      );
    }
    await render(<WithMagic />);
    const input = page.getByTestId(testIds.ruleMagicInput);
    await input.fill('every leg has a transfer');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await expect.poll(() => generate.mock.calls.length).toBe(1);
    expect(onRule).not.toHaveBeenCalled();
    await expect.element(input).toHaveValue('every leg has a transfer');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await expect.poll(() => onRule.mock.calls.length).toBe(1);
    expect(lastRule(onRule)).toEqual({ items: [{ kind: 'legs_covered' }], match: 'any' });
    await expect.element(input).toHaveValue('');
  });
});
