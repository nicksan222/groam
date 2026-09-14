import { Compass } from 'lucide-react';

/** One loading surface for product pages and their initial data. */
export function PageLoading({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div
      data-slot="page-loading"
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      className="flex min-h-80 min-w-0 flex-1 items-center justify-center bg-canvas px-6 py-16 sm:min-h-96"
    >
      <div className="flex max-w-xs flex-col items-center text-center">
        <div
          aria-hidden="true"
          className="relative mb-6 flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm"
        >
          <Compass className="size-6 text-primary motion-safe:animate-pulse" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A moment to get everything in place.
        </p>
      </div>
    </div>
  );
}
