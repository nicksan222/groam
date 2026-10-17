import { Button } from '@groam/ui/components/button';
import { Plus, X } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { ClauseKind, RuleClause, RuleDraftItem, RuleMatch } from '@/types/issues';
import { RuleClauseRow } from './rule-clause-row';
import { canAddToGroup, joinerWord, MAX_GROUP_CLAUSES } from './rule-draft';
import { RuleJoiner } from './rule-joiner';
import { RuleMatchLine } from './rule-match-line';

/** A nested set of conditions with its own all/any/none, counted as one row of the rule. */
export function RuleGroupCard({
  disabled,
  group,
  joiner,
  onAddClause,
  onChangeClause,
  onChangeKind,
  onChangeMatch,
  onRemove,
  onRemoveClause
}: {
  disabled?: boolean;
  group: Extract<RuleDraftItem, { kind: 'group' }>;
  joiner: string;
  onAddClause: () => void;
  onChangeClause: (rowKey: string, clause: RuleClause) => void;
  onChangeKind: (rowKey: string, kind: ClauseKind) => void;
  onChangeMatch: (match: RuleMatch) => void;
  onRemove: () => void;
  onRemoveClause: (rowKey: string) => void;
}) {
  const full = !canAddToGroup(group);
  return (
    <li
      className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
      data-testid={testIds.ruleGroup}
    >
      <RuleJoiner word={joiner} />
      <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-dashed border-border bg-muted/40 p-2">
        <div className="flex items-center gap-2 pl-1">
          <div className="min-w-0 flex-1">
            <RuleMatchLine
              disabled={disabled}
              label="Group match"
              match={group.match}
              onChange={onChangeMatch}
              suffix="of this group"
            />
          </div>
          <Button
            aria-label="Remove group"
            className="text-muted-foreground hover:text-foreground"
            disabled={disabled}
            onClick={onRemove}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        <ul className="space-y-2">
          {group.clauses.map((row, index) => (
            <RuleClauseRow
              clause={row.clause}
              disabled={disabled}
              joiner={joinerWord(group.match, index)}
              key={row.key}
              onChange={(clause) => onChangeClause(row.key, clause)}
              onChangeKind={(kind) => onChangeKind(row.key, kind)}
              onRemove={() => onRemoveClause(row.key)}
            />
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 sm:pl-14">
          <Button
            data-testid={testIds.ruleAddGroupClause}
            disabled={disabled || full}
            onClick={onAddClause}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus />
            Add to group
          </Button>
          {full ? (
            <span className="text-xs text-muted-foreground">
              Up to {MAX_GROUP_CLAUSES} per group.
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
