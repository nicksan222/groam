import { Skeleton } from '@groam/ui/components/skeleton';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export type LoadingPlaceholderProps = React.ComponentProps<'div'> & {
  bordered?: boolean;
  /** `page` fills a typical Shell content viewport while data loads. */
  density?: 'default' | 'page';
  label?: string;
  /** Shape of the skeleton preview. Defaults from density/bordered. */
  layout?: 'detail' | 'inline' | 'list';
};

function LoadingPlaceholder({
  bordered = false,
  className,
  density = 'default',
  label = 'Loading…',
  layout,
  ...props
}: LoadingPlaceholderProps) {
  const resolvedLayout = layout ?? (density === 'page' ? 'list' : bordered ? 'list' : 'inline');
  const isInline = resolvedLayout === 'inline';

  return (
    <div
      aria-busy="true"
      aria-label={label}
      aria-live="polite"
      className={cn(
        'relative isolate overflow-hidden text-sm text-muted-foreground',
        density === 'page' && 'min-h-80',
        bordered && 'min-h-40 rounded-xl border border-border',
        bordered && density === 'page' && 'min-h-80',
        !isInline && density === 'page' && 'rounded-xl border border-border',
        isInline && 'flex items-center justify-center gap-2',
        className
      )}
      data-layout={resolvedLayout}
      data-slot="loading-placeholder"
      role="status"
      {...props}
    >
      {isInline ? (
        <>
          <Spinner aria-hidden role="presentation" />
          <span aria-hidden="true">{label}</span>
        </>
      ) : (
        <LoadingSurface
          bordered={bordered}
          density={density}
          label={label}
          layout={resolvedLayout}
        />
      )}
    </div>
  );
}

function LoadingSurface({
  bordered,
  density,
  label,
  layout
}: {
  bordered: boolean;
  density: 'default' | 'page';
  label: string;
  layout: 'detail' | 'list';
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'dashboard-reveal pointer-events-none absolute inset-0 bg-muted/25',
          bordered || density === 'page' ? 'rounded-[inherit]' : undefined
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'relative flex flex-col gap-4',
          density === 'page' ? 'p-5 sm:p-6' : 'p-4',
          layout === 'detail' && 'gap-5'
        )}
      >
        {layout === 'detail' ? <DetailSkeleton /> : <ListSkeleton dense={density !== 'page'} />}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
      >
        <div className="flex max-w-[min(100%,20rem)] items-center gap-2.5 rounded-full border border-border/70 bg-background/95 px-3.5 py-2 shadow-sm backdrop-blur-sm">
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40">
            <Spinner aria-hidden className="size-3.5 text-foreground/70" role="presentation" />
          </span>
          <span className="truncate font-medium text-foreground/80">{label}</span>
        </div>
      </div>
    </>
  );
}

function ListSkeleton({ dense }: { dense: boolean }) {
  const rows = dense ? 3 : 5;
  return (
    <>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border/35 px-4 py-2.5">
          <Skeleton className="h-3 w-[28%]" />
          <Skeleton className="hidden h-3 w-[12%] sm:block" />
          <Skeleton className="ml-auto hidden h-3 w-[10%] sm:block" />
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
        <div className="hidden flex-col gap-3 rounded-xl border border-border p-4 lg:flex">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-9 w-full rounded-lg" />
        </div>
      </div>
    </>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-border/35 px-4 py-3 last:border-b-0">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="hidden h-7 w-20 shrink-0 rounded-md sm:block" />
    </div>
  );
}

export { LoadingPlaceholder };
