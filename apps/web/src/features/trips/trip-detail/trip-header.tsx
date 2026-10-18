import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import type { TripHeaderProps } from '@/types/trip-header';
import { TripCoverBanner } from './trip-cover-banner';

/**
 * The header of a trip page: full-width cover, title and chips anchored to the bottom, actions on
 * the right. The shared trip and an idea's working copy both render it.
 */
export function TripHeader({
  actions,
  chips,
  cover,
  dataTripId,
  dataTripName,
  status,
  testId,
  title
}: TripHeaderProps) {
  return (
    <div className="w-full shrink-0">
      <TripCoverBanner cover={cover} slot="trip-toolbar">
        <div className="flex w-full flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 max-w-full flex-col gap-2 max-sm:w-full">
            {status ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">{status}</div>
            ) : null}
            <Shell.Title
              className={cn(
                'min-w-0 max-w-full truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl',
                cover.src && 'text-white drop-shadow-sm'
              )}
              data-testid={testId}
              data-trip-id={dataTripId}
              data-trip-name={dataTripName}
              title={title}
            >
              {title}
            </Shell.Title>
            {chips}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 max-sm:w-full">
            {actions}
          </div>
        </div>
      </TripCoverBanner>
    </div>
  );
}
