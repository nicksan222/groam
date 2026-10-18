import { Input } from '@groam/ui/components/input';
import { cn } from '@groam/ui/lib/utils';

export type NumberInputProps = {
  className?: string;
  disabled?: boolean;
  label: string;
  /** Upper bound; a finite value above it is clamped on blur. */
  max?: number;
  /** Lower bound, `0` by default; a finite value below it is clamped on blur. */
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

/**
 * A narrow controlled number box. An empty box reads as `NaN` so callers can reject
 * it; out-of-range values are left alone while typing and clamped on blur.
 */
export function NumberInput({
  className,
  disabled,
  label,
  max,
  min = 0,
  onChange,
  step = 1,
  value
}: NumberInputProps) {
  const clampOnBlur = () => {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, value));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <Input
      aria-label={label}
      className={cn('h-8 w-20', className)}
      disabled={disabled}
      inputMode={Number.isInteger(step) ? 'numeric' : 'decimal'}
      max={max}
      min={min}
      onBlur={clampOnBlur}
      onChange={(event) => onChange(event.target.valueAsNumber)}
      step={step}
      type="number"
      value={Number.isFinite(value) ? value : ''}
    />
  );
}
