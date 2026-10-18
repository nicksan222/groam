import type { ReactNode } from 'react';

export type SuggestRowProps = {
  description: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onSelect: () => void;
  title: ReactNode;
};

function SuggestRow({ description, disabled = false, icon, onSelect, title }: SuggestRowProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border/70 bg-background"
      data-slot="suggest-row"
    >
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 active:bg-muted/70"
        disabled={disabled}
        onClick={onSelect}
        type="button"
      >
        {icon}
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="block text-[11px] text-muted-foreground">{description}</span>
        </span>
      </button>
    </div>
  );
}

export { SuggestRow };
