import { IconTile } from '@groam/ui/components/icon-tile';
import { cn } from '@groam/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';

export type MetricTile = {
  icon?: LucideIcon;
  label: string;
  longLabel?: string;
  value: number | string;
};

export type MetricTilesProps = React.ComponentProps<'div'> & {
  items: MetricTile[];
};

function MetricTiles({ className, items, ...props }: MetricTilesProps) {
  return (
    <div
      className={cn('grid w-full grid-cols-4 gap-2', className)}
      data-slot="metric-tiles"
      {...props}
    >
      {items.map((item) => (
        <MetricTileCard item={item} key={item.label} />
      ))}
    </div>
  );
}

function MetricTileCard({ item }: { item: MetricTile }) {
  const Icon = item.icon;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border px-2.5 py-2.5 sm:px-3 sm:py-3">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        {Icon ? (
          <IconTile size="xs" variant="primary">
            <Icon aria-hidden className="size-3" />
          </IconTile>
        ) : null}
        <p className="min-w-0 truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          <span className="xl:hidden">{item.label}</span>
          <span className="hidden xl:inline">{item.longLabel ?? item.label}</span>
        </p>
      </div>
      <p className="line-clamp-2 text-sm font-semibold tracking-tight tabular-nums sm:text-base xl:text-lg">
        {item.value}
      </p>
    </div>
  );
}

export { MetricTiles };
