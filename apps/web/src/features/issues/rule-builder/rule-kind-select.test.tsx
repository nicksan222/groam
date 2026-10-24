import { clauseKindsByCategory } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { clauseKindList } from '@groam/backend/convex/modules/travel/issues/rules/kinds/index';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RuleKindSelect } from './rule-kind-select';

const categories = clauseKindsByCategory();

describe('RuleKindSelect', () => {
  test('shows the current kind on the trigger', async () => {
    await render(<RuleKindSelect onChange={vi.fn()} value="daily_activities" />);
    const title = categories
      .flatMap((c) => c.kinds)
      .find((k) => k.kind === 'daily_activities')!.title;
    await expect.element(page.getByLabelText('Condition')).toHaveTextContent(title);
  });

  test('lists every kind under its category heading', async () => {
    await render(<RuleKindSelect onChange={vi.fn()} value="has_dates" />);
    await page.getByLabelText('Condition').click();
    for (const category of categories) {
      if (category.kinds.length > 0) {
        await expect.element(page.getByText(category.title, { exact: true })).toBeVisible();
      }
    }
    const all = categories.flatMap((c) => c.kinds);
    expect(all).toHaveLength(clauseKindList.length);
    for (const { kind } of clauseKindList) {
      const title = all.find((k) => k.kind === kind)!.title;
      expect(page.getByRole('option', { name: title, exact: true }).elements()).toHaveLength(1);
    }
  });

  test('reports the chosen kind', async () => {
    const onChange = vi.fn();
    await render(<RuleKindSelect onChange={onChange} value="has_dates" />);
    await page.getByLabelText('Condition').click();
    const target = categories.flatMap((c) => c.kinds).find((k) => k.kind === 'nights_covered')!;
    await page.getByRole('option', { name: target.title, exact: true }).click();
    expect(onChange).toHaveBeenCalledWith('nights_covered');
  });

  test('disables the trigger', async () => {
    await render(<RuleKindSelect disabled onChange={vi.fn()} value="has_dates" />);
    await expect.element(page.getByLabelText('Condition')).toBeDisabled();
  });
});
