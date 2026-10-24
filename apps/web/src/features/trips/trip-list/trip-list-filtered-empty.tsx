import { Map as MapIcon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';

/**
 * Shown when filters hide every loaded trip. While later pages are still being searched it
 * says so instead of claiming nothing matches.
 */
export function TripListFilteredEmpty({
  message,
  onReset,
  searching
}: {
  message: string;
  onReset: () => void;
  searching: boolean;
}) {
  return (
    <div
      aria-busy={searching}
      className="col-span-full rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      data-slot="trip-list-filtered-empty"
    >
      <MapIcon aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
      <div aria-live="polite">
        <p className="font-medium text-foreground">
          {searching ? 'Looking through more trips…' : message}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {searching
            ? 'Nothing on the loaded trips matches yet.'
            : 'Try a different search or change your status filter.'}
        </p>
      </div>
      <Button className="mt-4" onClick={onReset} variant="outline">
        Reset filters
      </Button>
    </div>
  );
}
