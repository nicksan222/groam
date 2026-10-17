import { MAX_GROUP_CLAUSES } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { RuleDraftGroup } from '@/types/issues';
import { RuleGroupCard } from './rule-group-card';

function makeGroup(count: number, match: RuleDraftGroup['match'] = 'all'): RuleDraftGroup {
  return {
    clauses: Array.from({ length: count }, (_, index) => ({
      clause: { count: index + 1, kind: 'daily_activities' as const },
      key: `row-${index}`
    })),
    key: 'group-1',
    kind: 'group',
    match
  };
}

function setup(group: RuleDraftGroup, disabled?: boolean) {
  const handlers = {
    onAddClause: vi.fn(),
    onChangeClause: vi.fn(),
    onChangeKind: vi.fn(),
    onChangeMatch: vi.fn(),
    onRemove: vi.fn(),
    onRemoveClause: vi.fn()
  };
  return {
    ...handlers,
    mount: () =>
      render(
        <ul>
          <RuleGroupCard disabled={disabled} group={group} joiner="and" {...handlers} />
        </ul>
      )
  };
}

describe('RuleGroupCard', () => {
  test('labels the group match and lists its conditions', async () => {
    await setup(makeGroup(2)).mount();
    await expect.element(page.getByText('of this group')).toBeVisible();
    await expect.element(page.getByLabelText('Group match')).toHaveTextContent('all');
    expect(page.getByTestId(testIds.ruleClause).elements()).toHaveLength(2);
  });

  test('uses When, then the match joiner, for the conditions inside', async () => {
    await setup(makeGroup(2, 'any')).mount();
    const rows = page.getByTestId(testIds.ruleClause).elements();
    expect(rows[0]?.textContent).toContain('When');
    expect(rows[1]?.textContent).toContain('or');
    await expect.element(page.getByText('and', { exact: true }).first()).toBeInTheDocument();
  });

  test('changes the group match', async () => {
    const { mount, onChangeMatch } = setup(makeGroup(1));
    await mount();
    await page.getByLabelText('Group match').click();
    await page.getByRole('option', { name: 'none' }).click();
    expect(onChangeMatch).toHaveBeenCalledWith('none');
  });

  test('adds to the group', async () => {
    const { mount, onAddClause } = setup(makeGroup(1));
    await mount();
    await page.getByRole('button', { name: 'Add to group' }).click();
    expect(onAddClause).toHaveBeenCalledOnce();
  });

  test('cannot add past the group limit', async () => {
    await setup(makeGroup(MAX_GROUP_CLAUSES)).mount();
    await expect.element(page.getByRole('button', { name: 'Add to group' })).toBeDisabled();
    await expect.element(page.getByText(`Up to ${MAX_GROUP_CLAUSES} per group.`)).toBeVisible();
  });

  test('shows no limit hint while the group has room', async () => {
    await setup(makeGroup(1)).mount();
    await expect.element(page.getByText(/per group\./)).not.toBeInTheDocument();
  });

  test('removes the group', async () => {
    const { mount, onRemove } = setup(makeGroup(1));
    await mount();
    await page.getByRole('button', { name: 'Remove group' }).click();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  test('removes and edits a clause by its row key', async () => {
    const { mount, onRemoveClause, onChangeClause } = setup(makeGroup(2));
    await mount();
    await page.getByRole('button', { name: 'Remove condition' }).nth(1).click();
    expect(onRemoveClause).toHaveBeenCalledWith('row-1');
    await page.getByLabelText('Activities per day').first().fill('5');
    expect(onChangeClause).toHaveBeenLastCalledWith('row-0', {
      count: 5,
      kind: 'daily_activities'
    });
  });

  test('disabled locks the group controls', async () => {
    await setup(makeGroup(1), true).mount();
    await expect.element(page.getByRole('button', { name: 'Remove group' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Add to group' })).toBeDisabled();
    await expect.element(page.getByLabelText('Group match')).toBeDisabled();
  });
});
