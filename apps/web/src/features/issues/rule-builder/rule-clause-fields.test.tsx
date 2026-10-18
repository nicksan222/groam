import { MAX_RULE_TEXT_LENGTH } from '@groam/backend/convex/modules/travel/issues/rules/helpers';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { RuleClause } from '@/types/issues';
import { RuleClauseFields } from './rule-clause-fields';

const activities: RuleClause = { count: 1, kind: 'daily_activities', titleIncludes: 'dinner' };

describe('RuleClauseFields', () => {
  test('edits a number setting', async () => {
    const onChange = vi.fn();
    await render(<RuleClauseFields clause={activities} onChange={onChange} />);
    await page.getByLabelText('Activities per day').fill('3');
    expect(onChange).toHaveBeenLastCalledWith({ ...activities, count: 3 });
  });

  test('caps text length and drops a cleared optional text', async () => {
    const onChange = vi.fn();
    await render(<RuleClauseFields clause={activities} onChange={onChange} />);
    const title = page.getByLabelText('Title includes');
    await expect.element(title).toHaveAttribute('maxlength', String(MAX_RULE_TEXT_LENGTH));
    await title.fill('');
    expect(onChange).toHaveBeenLastCalledWith({ count: 1, kind: 'daily_activities' });
  });

  test('keeps a cleared required text as an empty string', async () => {
    const onChange = vi.fn();
    await render(
      <RuleClauseFields clause={{ kind: 'destination_named', text: 'Rome' }} onChange={onChange} />
    );
    await page.getByRole('textbox').fill('');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'destination_named', text: '' });
  });

  test('clears an optional choice when "any" is picked', async () => {
    const onChange = vi.fn();
    await render(
      <RuleClauseFields
        clause={{ boundary: 'arrival', kind: 'boundary_transfer', mode: 'flight' }}
        onChange={onChange}
      />
    );
    await page.getByLabelText('Travel mode').click();
    await page.getByRole('option', { name: 'any way' }).click();
    expect(onChange).toHaveBeenLastCalledWith({ boundary: 'arrival', kind: 'boundary_transfer' });
  });
});
