import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import type { IssueCondition } from '@/types/issues';
import { useRuleDraft } from './use-rule-draft';

const rule = { items: [{ kind: 'within_budget' as const }], match: 'all' as const };
const ruleCondition = {
  items: [{ detail: null, kind: 'clause', label: 'Planned costs fit the budget', met: true }],
  kind: 'rule',
  label: 'Planned costs fit the budget',
  match: 'all',
  met: true,
  refusal: 'Settled automatically.',
  rule,
  starter: false
} satisfies IssueCondition;
const manual = { kind: 'manual', label: 'Flights booked', met: null } satisfies IssueCondition;

describe('useRuleDraft', () => {
  test('starts empty for a new issue and sends nothing', async () => {
    const { result } = await renderHook(() => useRuleDraft(null, 'empty'));
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.input).toEqual({});
  });

  test('starts with a first row when editing an issue without a rule', async () => {
    const { result } = await renderHook(() => useRuleDraft(manual, 'row'));
    expect(result.current.input.rule?.items).toEqual([
      expect.objectContaining({ kind: 'daily_activities' })
    ]);
  });

  test('opens on a saved rule, clears with no rows, and resets back', async () => {
    const { result } = await renderHook(() => useRuleDraft(ruleCondition, 'row'));
    expect(result.current.input).toEqual({ rule });
    await act(async () => result.current.setDraft({ items: [], match: 'all' }));
    expect(result.current.input).toEqual({});
    await act(async () => result.current.reset());
    expect(result.current.input).toEqual({ rule });
  });
});
