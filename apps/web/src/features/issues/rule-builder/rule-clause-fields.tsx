import { MAX_RULE_TEXT_LENGTH } from '@groam/backend/convex/modules/travel/issues/rules/helpers';
import { clauseFields } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { InlineSelect } from '@groam/ui/components/inline-select';
import { Input } from '@groam/ui/components/input';
import { NumberInput } from '@groam/ui/components/number-input';
import { cn } from '@groam/ui/lib/utils';
import type { ClauseField, RuleClause, RuleOption } from '@/types/issues';
import { setClauseField } from './rule-draft';

/** Radix Select has no empty value, so an optional choice uses this for "not set". */
const ANY = 'any';

function choiceOptions(field: Extract<ClauseField, { type: 'choice' }>): Array<RuleOption<string>> {
  const options = Object.entries(field.options).map(([value, label]) => ({ label, value }));
  return field.any ? [{ label: field.any, value: ANY }, ...options] : options;
}

function RuleFieldInput({
  disabled,
  field,
  onChange,
  value
}: {
  disabled?: boolean;
  field: ClauseField;
  onChange: (value: number | string) => void;
  value: unknown;
}) {
  switch (field.type) {
    case 'number': {
      return (
        <NumberInput
          className="w-16"
          disabled={disabled}
          label={field.label}
          onChange={onChange}
          value={typeof value === 'number' ? value : Number.NaN}
        />
      );
    }
    case 'text': {
      return (
        <Input
          aria-label={field.label}
          className="h-8 min-w-36 flex-1 sm:max-w-52"
          disabled={disabled}
          maxLength={MAX_RULE_TEXT_LENGTH}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
        />
      );
    }
    case 'choice': {
      return (
        <InlineSelect
          disabled={disabled}
          label={field.label}
          onChange={(next) => onChange(next === ANY ? '' : next)}
          options={choiceOptions(field)}
          value={typeof value === 'string' ? value : ANY}
        />
      );
    }
  }
}

/** A clause's settings, laid out to read like its sentence; every kind declares its own. */
export function RuleClauseFields({
  clause,
  disabled,
  onChange
}: {
  clause: RuleClause;
  disabled?: boolean;
  onChange: (clause: RuleClause) => void;
}) {
  const values: Record<string, unknown> = clause;
  return clauseFields(clause.kind).map((field) => (
    // Each setting wraps as one unit, so "at least" never strands without its number.
    <span
      className={cn('flex items-center gap-1.5', field.type === 'text' && 'min-w-0 flex-1')}
      key={field.key}
    >
      {field.lead ? <span className="text-sm text-muted-foreground">{field.lead}</span> : null}
      <RuleFieldInput
        disabled={disabled}
        field={field}
        onChange={(value) => onChange(setClauseField(clause, field, value))}
        value={values[field.key]}
      />
    </span>
  ));
}
