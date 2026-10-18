'use client';

import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import type { PropertyGridProps } from '#src/components/shell/types/banner';
import { SHELL_PROPERTY_GRID, SHELL_PROPERTY_ROW } from '#src/lib/shell-layout';
import SurfaceWell from './surface-well';

const PROPERTY_GRID_SKELETON_KEYS = [
  'property-grid-skeleton-a',
  'property-grid-skeleton-b',
  'property-grid-skeleton-c',
  'property-grid-skeleton-d',
  'property-grid-skeleton-e',
  'property-grid-skeleton-f'
] as const;

/** Bordered facts grid for overview-style property rows. */
const PropertyGrid = ({
  className,
  isLoading = false,
  items = [],
  loadingCount = 4,
  loadingLabels,
  ...props
}: PropertyGridProps) => (
  <SurfaceWell as="dl" className={cn(SHELL_PROPERTY_GRID, className)} {...props}>
    {isLoading
      ? PROPERTY_GRID_SKELETON_KEYS.slice(0, loadingCount).map((slotKey, slotIndex) => {
          const label = loadingLabels?.[slotIndex] ?? null;
          return (
            <div
              className={cn(SHELL_PROPERTY_ROW, slotIndex > 0 && 'lg:border-l lg:border-border/35')}
              key={label ?? slotKey}
            >
              {label ? (
                <dt className="shrink-0 text-[11px] font-medium text-muted-foreground lg:mb-1.5">
                  {label}
                </dt>
              ) : (
                <Skeleton className="h-3 w-16 shrink-0 lg:mb-1.5" />
              )}
              <dd className="min-w-0 text-right lg:text-left">
                <Skeleton className="ml-auto h-4 w-20 lg:ml-0" />
              </dd>
            </div>
          );
        })
      : items.map((item, index) => (
          <div
            className={cn(SHELL_PROPERTY_ROW, index > 0 && 'lg:border-l lg:border-border/35')}
            key={item.label}
          >
            <dt className="shrink-0 text-[11px] font-medium text-muted-foreground lg:mb-1.5">
              {item.label}
            </dt>
            <dd
              className={cn(
                'min-w-0 text-right text-sm font-medium tracking-tight text-pretty break-words lg:text-left',
                item.numeric && 'tabular-nums'
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
  </SurfaceWell>
);

export default PropertyGrid;
