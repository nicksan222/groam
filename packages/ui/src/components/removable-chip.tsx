import { cn } from '@groam/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export type RemovableChipProps = {
  disabled?: boolean;
  icon?: LucideIcon;
  label: ReactNode;
  onRemove: () => void;
  removeLabel: string;
  title?: string;
};

function RemovableChip({
  disabled = false,
  icon: Icon,
  label,
  onRemove,
  removeLabel,
  title
}: RemovableChipProps) {
  return (
    <div className="flex gap-1.5 px-1" data-slot="removable-chip">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium'
        )}
        title={title}
      >
        {Icon ? <Icon className="size-3 text-muted-foreground" /> : null}
        {label}
        <button
          aria-label={removeLabel}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          <X className="size-2.5" />
        </button>
      </span>
    </div>
  );
}

export { RemovableChip };
