import { useCallback, useState } from 'react';
import {
  draftFromRule,
  ruleFromDraft,
  startingDraft
} from '@/features/issues/rule-builder/rule-draft';
import type { IssueCondition, IssueConditionInput, RuleDraft } from '@/types/issues';

function initialDraft(condition: IssueCondition | null, start: 'empty' | 'row'): RuleDraft {
  if (condition?.kind === 'rule') return draftFromRule(condition.rule);
  return start === 'row' ? startingDraft() : draftFromRule(null);
}

/**
 * The "done when" rule a form is building. With no rows it sends nothing, which leaves a new
 * issue without a rule and clears an existing one. `start` is where a form with no saved rule
 * begins: empty (creating an issue, where a rule is optional) or with a first row (editing).
 */
export function useRuleDraft(condition: IssueCondition | null, start: 'empty' | 'row') {
  const [draft, setDraft] = useState<RuleDraft>(() => initialDraft(condition, start));
  const reset = useCallback(() => setDraft(initialDraft(condition, start)), [condition, start]);
  const input: IssueConditionInput = draft.items.length > 0 ? { rule: ruleFromDraft(draft) } : {};
  return { draft, input, isEmpty: draft.items.length === 0, reset, setDraft };
}
