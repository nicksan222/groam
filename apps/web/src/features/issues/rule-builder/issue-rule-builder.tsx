import { ruleLabel } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { Button } from '@groam/ui/components/button';
import { CircleCheck, ListPlus, Plus, Workflow } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { IssueRule, RuleDraft } from '@/types/issues';
import { RuleClauseRow } from './rule-clause-row';
import {
  addClause,
  addGroup,
  addGroupClause,
  canAddItem,
  draftFromRule,
  joinerWord,
  MAX_RULE_ITEMS,
  removeGroupClause,
  removeItem,
  ruleFromDraft,
  setClause,
  setClauseKind,
  setGroupMatch,
  setRuleMatch
} from './rule-draft';
import { RuleGroupCard } from './rule-group-card';
import { RuleMagicInput } from './rule-magic-input';
import { RuleMatchLine } from './rule-match-line';

/** "The trip has …" reads on from "Moves to Done when"; "None of: …" keeps its capital. */
function sentenceTail(label: string): string {
  return label.startsWith('None of') ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

function AddButtons({
  disabled,
  draft,
  onChange
}: {
  disabled?: boolean;
  draft: RuleDraft;
  onChange: (draft: RuleDraft) => void;
}) {
  const full = !canAddItem(draft);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        data-testid={testIds.ruleAddCondition}
        disabled={disabled || full}
        onClick={() => onChange(addClause(draft))}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add condition
      </Button>
      <Button
        data-testid={testIds.ruleAddGroup}
        disabled={disabled || full}
        onClick={() => onChange(addGroup(draft))}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ListPlus />
        Add group
      </Button>
      {full ? (
        <span className="text-xs text-muted-foreground">Up to {MAX_RULE_ITEMS} rows.</span>
      ) : null}
    </div>
  );
}

/**
 * Composes a "done when" rule from conditions on the shared trip, joined with all, any, or none,
 * with one level of groups. The system checks it whenever the trip changes and moves the issue
 * to Done while it holds. With `generate`, a sentence can draft the rows instead.
 */
export function IssueRuleBuilder({
  disabled,
  draft,
  generate,
  onChange
}: {
  disabled?: boolean;
  draft: RuleDraft;
  generate?: (text: string) => Promise<IssueRule | null>;
  onChange: (draft: RuleDraft) => void;
}) {
  const magic = generate ? (
    <RuleMagicInput
      disabled={disabled}
      generate={generate}
      onRule={(rule) => onChange(draftFromRule(rule))}
    />
  ) : null;
  if (draft.items.length === 0) {
    return (
      <div className="space-y-3">
        {magic}
        <div
          className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center"
          data-testid={testIds.ruleBuilder}
        >
          <Workflow aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">No rule yet</p>
            <p className="text-xs text-muted-foreground">
              Pick conditions on the trip. The issue moves to Done by itself once they hold.
            </p>
          </div>
          <AddButtons disabled={disabled} draft={draft} onChange={onChange} />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid={testIds.ruleBuilder}>
      {magic}
      <RuleMatchLine
        disabled={disabled}
        label="Rule match"
        match={draft.match}
        onChange={(match) => onChange(setRuleMatch(draft, match))}
        prefix="Move to Done when"
        suffix="of these are true"
      />
      <ul className="space-y-2">
        {draft.items.map((item, index) =>
          item.kind === 'group' ? (
            <RuleGroupCard
              disabled={disabled}
              group={item}
              joiner={joinerWord(draft.match, index)}
              key={item.key}
              onAddClause={() => onChange(addGroupClause(draft, item.key))}
              onChangeClause={(rowKey, clause) => onChange(setClause(draft, rowKey, clause))}
              onChangeKind={(rowKey, kind) => onChange(setClauseKind(draft, rowKey, kind))}
              onChangeMatch={(match) => onChange(setGroupMatch(draft, item.key, match))}
              onRemove={() => onChange(removeItem(draft, item.key))}
              onRemoveClause={(rowKey) => onChange(removeGroupClause(draft, item.key, rowKey))}
            />
          ) : (
            <RuleClauseRow
              clause={item.clause}
              disabled={disabled}
              joiner={joinerWord(draft.match, index)}
              key={item.key}
              onChange={(clause) => onChange(setClause(draft, item.key, clause))}
              onChangeKind={(kind) => onChange(setClauseKind(draft, item.key, kind))}
              onRemove={() => onChange(removeItem(draft, item.key))}
            />
          )
        )}
      </ul>
      <div className="sm:pl-14">
        <AddButtons disabled={disabled} draft={draft} onChange={onChange} />
      </div>
      <p
        aria-live="polite"
        className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
        data-testid={testIds.rulePreview}
      >
        <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0 text-success-foreground" />
        <span className="min-w-0">
          <span className="font-medium text-foreground">Moves to Done when </span>
          {sentenceTail(ruleLabel(ruleFromDraft(draft)))}
        </span>
      </p>
    </div>
  );
}
