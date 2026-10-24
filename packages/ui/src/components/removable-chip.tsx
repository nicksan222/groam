import { X } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

export type RemovableChipProps = {
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  onRemove: () => void;
  removeLabel: string;
  title?: string;
};

function RemovableChip({
  className,
  disabled = false,
  icon,
  label,
  onRemove,
  removeLabel,
  title
}: RemovableChipProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-muted/60 px-2 py-1 text-[11px]',
        className
      )}
      data-slot="removable-chip"
      title={title}
    >
      {icon}
      {label}
      <button
        aria-label={removeLabel}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        disabled={disabled}
        onClick={onRemove}
        type="button"
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}

export { RemovableChip };
