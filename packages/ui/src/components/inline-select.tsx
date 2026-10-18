import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';

export type InlineSelectOption<V extends string> = { label: string; value: V };

/**
 * A compact controlled select for one inline field; `label` names it for screen readers.
 * Option values must be non-empty (Radix reserves `''` for "no selection"), so map an
 * "any" choice to a sentinel value.
 */
export function InlineSelect<V extends string>({
  disabled,
  label,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: V) => void;
  options: ReadonlyArray<InlineSelectOption<V>>;
  value: V;
}) {
  return (
    <Select disabled={disabled} onValueChange={(next) => onChange(next as V)} value={value}>
      <SelectTrigger aria-label={label} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
