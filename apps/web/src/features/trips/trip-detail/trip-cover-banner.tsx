import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import type { TripCover } from '@/types/trip-cover';
import { TripCoverRefreshButton } from './trip-cover-refresh-button';

/** Full-width cover banner: a photo under one even scrim, or a calm tinted surface when there is none. */
export function TripCoverBanner({
  children,
  cover,
  slot
}: {
  children: ReactNode;
  cover: TripCover;
  slot: string;
}) {
  const hasImage = cover.src !== null;
  return (
    <div
      className={cn(
        'group/trip-cover relative isolate flex w-full shrink-0 flex-col justify-end overflow-hidden px-6 py-4',
        hasImage
          ? 'min-h-[120px] bg-muted text-white sm:min-h-[140px]'
          : 'min-h-20 border-b border-border bg-muted/60 text-foreground sm:min-h-[88px]'
      )}
      data-cover={hasImage ? 'image' : 'fallback'}
      data-slot={slot}
    >
      {cover.src ? (
        <>
          <img
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
            onError={cover.onImageError}
            src={cover.src}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-black/30" />
        </>
      ) : null}
      <div className="absolute top-2 right-6 flex items-center gap-2">
        {cover.showPending ? (
          <span className="inline-flex items-center gap-1.5 h-6 rounded-full bg-background/80 px-2.5 text-xs text-foreground backdrop-blur-sm">
            <Spinner className="size-3 motion-reduce:animate-none" /> Finding a cover image…
          </span>
        ) : null}
        {cover.canRefresh ? (
          <div
            className={cn(
              'opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
              'group-hover/trip-cover:opacity-100 group-focus-within/trip-cover:opacity-100',
              '[@media(hover:none)]:opacity-100',
              cover.isBusy && 'opacity-100'
            )}
          >
            <TripCoverRefreshButton
              className="border-transparent bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
              cover={cover}
            />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
