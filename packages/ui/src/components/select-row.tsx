import { cn } from '@groam/ui/lib/utils';
import { Check } from 'lucide-react';
import type * as React from 'react';
import type { ReactNode } from 'react';

export type SelectRowProps = Omit<React.ComponentProps<'button'>, 'onSelect' | 'type'> & {
  icon: ReactNode;
  onSelect: () => void;
  selected?: boolean;
  subtitle?: ReactNode;
  title: ReactNode;
};

function SelectRow({
  className,
  icon,
  onSelect,
  selected = false,
  subtitle,
  title,
  ...props
}: SelectRowProps) {
  return (
    <button
      className={cn(
        'group flex min-h-16 w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30',
        className
      )}
      data-slot="select-row"
      onClick={onSelect}
      type="button"
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

export { SelectRow };
