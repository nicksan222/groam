import { clauseLabel } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Card } from '@groam/ui/components/card';
import { testIds } from '@/lib/test-ids';
import type { ClauseKind, RuleClause } from '@/types/issues';
import { RuleClauseFields } from './rule-clause-fields';
import { RuleJoiner } from './rule-joiner';
import { RuleKindSelect } from './rule-kind-select';

/** One condition: its lead word, what it checks, its settings, and the sentence it saves as. */
export function RuleClauseRow({
  clause,
  disabled,
  joiner,
  onChange,
  onChangeKind,
  onRemove
}: {
  clause: RuleClause;
  disabled?: boolean;
  joiner: string;
  onChange: (clause: RuleClause) => void;
  onChangeKind: (kind: ClauseKind) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
      data-kind={clause.kind}
      data-testid={testIds.ruleClause}
    >
      <RuleJoiner word={joiner} />
      <Card className="min-w-0 flex-1 flex-row items-start gap-2 p-2 shadow-xs/5" variant="inset">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RuleKindSelect disabled={disabled} onChange={onChangeKind} value={clause.kind} />
            <RuleClauseFields clause={clause} disabled={disabled} onChange={onChange} />
          </div>
          <p className="px-1 text-xs text-muted-foreground">{clauseLabel(clause)}</p>
        </div>
        <Button
          aria-label="Remove condition"
          className="text-muted-foreground hover:text-foreground"
          data-testid={testIds.ruleRemove}
          disabled={disabled}
          onClick={onRemove}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </Card>
    </li>
  );
}
