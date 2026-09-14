import { Select, SelectContent, SelectItem, SelectTrigger } from '@groam/ui/components/select';
import { listFilterTriggerClassName } from '@groam/ui/lib/data-table';
import { CirclePlus } from 'lucide-react';

export function ListStatusFilterSelect<TStatus extends string>({
  ariaLabel,
  hasValue = false,
  labels,
  onChange,
  optionTestId,
  options,
  testId,
  value
}: {
  ariaLabel: string;
  /** When true, Halo solid border — typically status ≠ default. */
  hasValue?: boolean;
  labels: Record<TStatus, string>;
  onChange: (value: TStatus) => void;
  optionTestId?: string;
  options: readonly { label: string; value: TStatus }[];
  testId?: string;
  value: TStatus;
}) {
  return (
    <Select onValueChange={(next) => onChange(next as TStatus)} value={value}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={listFilterTriggerClassName}
        data-has-value={hasValue || undefined}
        data-testid={testId}
        size="sm"
      >
        <CirclePlus className="size-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
        <span className="truncate">{labels[value]}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            data-status={option.value}
            data-testid={optionTestId}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
