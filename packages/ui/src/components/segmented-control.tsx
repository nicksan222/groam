import { Button } from '@groam/ui/components/button';
import { moveRadioFocus } from '@groam/ui/lib/roving-radio';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

/**
 * A row of equal choices where exactly one is on. Each option's value is also written to the
 * `data-*` attribute named by `attribute`, so tests and styles can read the choice off the DOM.
 * With `radio` the row is a real radio group: arrow keys, Home and End move focus (Enter or Space chooses) and only the checked
 * option (or the first enabled one, if the checked is disabled) is a tab stop; otherwise each option is a pressed-state button.
 */
export function SegmentedControl<Value extends string>({
  attribute,
  className,
  label,
  onChange,
  options,
  radio = false,
  size = 'sm',
  testId,
  value
}: {
  /** The `data-*` attribute that carries each option's value. */
  attribute: `data-${string}`;
  className?: string;
  /** Names the group for assistive technology. */
  label: string;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{
    /** Extra classes for this option while it is the chosen one. */
    activeClassName?: string;
    /** Names an element that explains why the option is unavailable. */
    describedBy?: string;
    disabled?: boolean;
    label: ReactNode;
    /** A native tooltip, such as why the option is unavailable. */
    title?: string;
    value: Value;
  }>;
  /** Makes the row a radio group (`radiogroup` and `radio`) instead of pressable buttons. */
  radio?: boolean;
  /** `sm` is 24px tall (32px on phones); `md` is 32px. */
  size?: 'md' | 'sm';
  testId?: string;
  value: Value;
}) {
  const enabled = options.filter((option) => !option.disabled);
  // The one tab stop: the chosen option, or the first enabled one when the chosen is disabled.
  const tabStop = enabled.find((option) => option.value === value) ?? enabled[0];
  return (
    <div
      aria-label={label}
      className={cn(
        'grid w-full auto-cols-fr grid-flow-col gap-1 rounded-md bg-muted p-1 md:inline-grid md:w-auto',
        className
      )}
      data-slot="segmented-control"
      role={radio ? 'radiogroup' : 'group'}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            {...{ [attribute]: option.value }}
            {...(radio
              ? {
                  'aria-checked': active,
                  role: 'radio',
                  tabIndex: option === tabStop ? 0 : -1
                }
              : { 'aria-pressed': active })}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-md:h-9',
              size === 'md' ? 'h-8' : 'h-6',
              active && 'bg-background text-foreground shadow-sm',
              active && option.activeClassName,
              option.disabled && 'cursor-not-allowed opacity-64 hover:text-muted-foreground'
            )}
            data-testid={testId}
            disabled={option.disabled}
            key={option.value}
            aria-describedby={option.describedBy}
            onClick={() => {
              if (!(radio && active)) onChange(option.value);
            }}
            onKeyDown={radio ? moveRadioFocus : undefined}
            title={option.title}
            type="button"
            unstyled
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
