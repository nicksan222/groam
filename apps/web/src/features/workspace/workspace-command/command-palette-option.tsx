import { CornerDownLeft } from '@groam/icons';
import { IconTile } from '@groam/ui/components/icon-tile';
import { MenuRow } from '@groam/ui/components/menu-row';
import { cn } from '@groam/ui/lib/utils';
import { useEffect, useRef } from 'react';
import type { CommandPaletteMatch } from '@/features/workspace/hooks/command-palette-results';

export function CommandPaletteOption({
  active,
  id,
  onHover,
  onSelect,
  result
}: {
  active: boolean;
  id: string;
  onHover: () => void;
  onSelect: () => void;
  result: CommandPaletteMatch;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <MenuRow
      aria-selected={active}
      className={cn(
        'h-10 gap-3 py-0 text-foreground outline-none transition-colors duration-100 hover:bg-transparent',
        active && 'bg-accent text-accent-foreground hover:bg-accent'
      )}
      density="popover"
      data-kind={result.kind}
      id={id}
      onClick={onSelect}
      onMouseMove={active ? undefined : onHover}
      ref={ref}
      role="option"
      tabIndex={-1}
    >
      <IconTile
        className={cn('transition-colors duration-100', active && 'border-primary/30 text-primary')}
        radius="md"
        size="xs"
        variant="outline-muted"
      >
        <result.icon className="size-3.5" />
      </IconTile>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate">
          <HighlightedLabel label={result.label} range={result.highlight} />
        </span>
        {result.detail ? (
          <span className="shrink-[2] truncate text-xs text-muted-foreground">{result.detail}</span>
        ) : null}
      </span>
      <CornerDownLeft
        aria-hidden
        className={cn(
          'size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-100',
          active && 'opacity-100'
        )}
      />
    </MenuRow>
  );
}

function HighlightedLabel({ label, range }: { label: string; range?: [number, number] }) {
  if (!range) return label;
  const [start, end] = range;
  return (
    <>
      {label.slice(0, start)}
      <mark className="bg-transparent font-semibold text-foreground underline decoration-primary/40 decoration-2 underline-offset-[3px]">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}
