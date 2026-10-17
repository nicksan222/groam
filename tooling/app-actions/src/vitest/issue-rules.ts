import { expect } from 'vite-plus/test';
import { type Locator, page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by } from './locators';
import { inOrder, tap } from './queries';

export type RuleMatch = 'all' | 'any' | 'none';

/** A nested group of conditions, by their kind-picker titles ("Length is set"). */
export type RuleGroupSpec = { group: readonly string[]; match?: RuleMatch };

/**
 * A "Done when" rule as the builder reads it: its match word and rows, each a condition by its
 * kind-picker title or a group of them. Conditions keep their default settings.
 */
export type RuleSpec = { items: ReadonlyArray<RuleGroupSpec | string>; match?: RuleMatch };

async function pickOption(trigger: Locator, name: string): Promise<void> {
  await tap(trigger);
  await tap(page.getByRole('option', { name, exact: true }));
  await expect.element(trigger).toHaveTextContent(name);
}

async function pickKind(row: Locator, title: string): Promise<void> {
  await pickOption(by(ids.ruleClauseKind, row), title);
}

async function addGroup(spec: RuleGroupSpec, builder: Locator): Promise<void> {
  await tap(by(ids.ruleAddGroup, builder));
  const group = by(ids.ruleGroup, builder).last();
  await expect.element(group).toBeVisible();
  if (spec.match)
    await pickOption(group.getByRole('combobox', { name: 'Group match' }), spec.match);
  const rows = spec.group.map((title, index) => ({ index, title }));
  await inOrder(rows, async ({ index, title }) => {
    if (index > 0) await tap(by(ids.ruleAddGroupClause, group));
    await pickKind(by(ids.ruleClause, group).nth(index), title);
  });
}

/**
 * Builds a rule in the open rule builder (the create-issue dialog or the "Done when" dialog),
 * starting from an empty builder. Each new row lands last, so it is the last row in the builder.
 */
export async function buildIssueRule(spec: RuleSpec): Promise<void> {
  const builder = page.getByTestId(ids.ruleBuilder);
  await inOrder(spec.items, async (item) => {
    if (typeof item !== 'string') {
      await addGroup(item, builder);
      return;
    }
    await tap(by(ids.ruleAddCondition, builder));
    await pickKind(by(ids.ruleClause, builder).last(), item);
  });
  if (spec.match) {
    await pickOption(builder.getByRole('combobox', { name: 'Rule match' }), spec.match);
  }
  await expect.element(by(ids.rulePreview, builder)).toBeVisible();
}

/** Waits until the open issue's rule breakdown shows the condition as met or not yet. */
export async function expectRuleCondition(label: string, met: boolean): Promise<void> {
  await expect
    .element(by(ids.issueConditionItem).filter({ hasText: label }))
    .toHaveAttribute('data-met', String(met));
}

/** Waits until the open issue's whole "Done when" rule reads as met or not yet. */
export async function expectRuleMet(met: boolean): Promise<void> {
  await expect.element(by(ids.issueConditionPanel)).toHaveAttribute('data-met', String(met));
}
