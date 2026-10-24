import { clauseKindsByCategory } from '@groam/backend/convex/modules/travel/issues/rules/index';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { testIds } from '@/lib/test-ids';
import type { ClauseKind } from '@/types/issues';

const categories = clauseKindsByCategory();

/** Picks what a row checks, grouped by the part of the trip it reads. */
export function RuleKindSelect({
  disabled,
  onChange,
  value
}: {
  disabled?: boolean;
  onChange: (kind: ClauseKind) => void;
  value: ClauseKind;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => onChange(next as ClauseKind)}
      value={value}
    >
      <SelectTrigger
        aria-label="Condition"
        className="min-w-44 font-medium"
        data-testid={testIds.ruleClauseKind}
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectGroup key={category.category}>
            <SelectLabel>{category.title}</SelectLabel>
            {category.kinds.map((kind) => (
              <SelectItem key={kind.kind} title={kind.description} value={kind.kind}>
                {kind.title}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
