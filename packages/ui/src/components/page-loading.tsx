import { Compass } from '@groam/icons';

/**
 * The one loading state. Content-agnostic: it fills its container, centers
 * itself, and fades in after a short delay so fast loads never flash.
 * Animation lives in `styles/workspace.css` (`.page-loading*`).
 */
export function PageLoading({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div
      data-slot="page-loading"
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      className="flex min-h-64 min-w-0 flex-1 items-center justify-center px-6 py-12"
    >
      <div className="page-loading flex max-w-xs flex-col items-center text-center">
        <div aria-hidden="true" className="relative mb-6 flex size-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-[1.5px] border-border" />
          <span
            className="page-loading-orbit absolute inset-0 rounded-full border-[1.5px] border-transparent border-t-primary"
            data-slot="page-loading-orbit"
          />
          <div className="page-loading-tile flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
            <Compass className="size-6 text-primary" />
          </div>
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A moment to get everything in place.
        </p>
      </div>
    </div>
  );
}
