import { InlineSelect } from '@groam/ui/components/inline-select';
import { testIds } from '@/lib/test-ids';
import type { RuleMatch, RuleOption } from '@/types/issues';

const matchOptions: Array<RuleOption<RuleMatch>> = [
  { label: 'all', value: 'all' },
  { label: 'any', value: 'any' },
  { label: 'none', value: 'none' }
];

/** "[All] of these are true", the joiner for a rule or one group. */
export function RuleMatchLine({
  disabled,
  label,
  match,
  onChange,
  prefix,
  suffix
}: {
  disabled?: boolean;
  label: string;
  match: RuleMatch;
  onChange: (match: RuleMatch) => void;
  prefix?: string;
  suffix: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm" data-testid={testIds.ruleMatch}>
      {prefix ? <span className="font-medium">{prefix}</span> : null}
      <InlineSelect
        disabled={disabled}
        label={label}
        onChange={onChange}
        options={matchOptions}
        value={match}
      />
      <span className="text-muted-foreground">{suffix}</span>
    </div>
  );
}
