import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { LiftCard } from '@groam/ui/components/lift-card';
import { Spinner } from '@groam/ui/components/spinner';
import { Camera, Map as MapIcon, MapPinned, Plus, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';

function CoverVisual({
  onAddDestination,
  trip
}: {
  onAddDestination: () => void;
  trip: TripDetail;
}) {
  if (trip.coverUrl) {
    return (
      <img
        alt={trip.coverAttribution?.title ?? `${trip.name} cover`}
        className="absolute inset-0 size-full object-cover"
        src={trip.coverUrl}
      />
    );
  }
  return (
    <div className="absolute inset-0 grid place-items-center px-8 text-center">
      <MapIcon className="absolute -bottom-16 -right-12 size-64 text-muted-foreground/[0.06]" />
      {trip.coverStatus === 'pending' ? (
        <span className="relative flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Creating a destination cover…
        </span>
      ) : trip.destinations.length === 0 ? (
        <div className="relative max-w-xs">
          <MapPinned className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">A destination brings this space to life</p>
          {(trip.permissions.canEdit || trip.permissions.canPropose) && (
            <Button className="mt-4" onClick={onAddDestination} size="sm" variant="outline">
              <Plus /> Add destination
            </Button>
          )}
        </div>
      ) : (
        <MapIcon className="relative size-14 text-muted-foreground/25" />
      )}
    </div>
  );
}

function CoverAttribution({ attribution }: { attribution: TripDetail['coverAttribution'] }) {
  if (!attribution) return null;
  return (
    <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2.5 text-right text-[9px] leading-4 text-white/80">
      {attribution.creator && (
        <>
          Photo by{' '}
          <a
            className="underline underline-offset-2 hover:text-white"
            href={attribution.creatorUrl ?? attribution.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {attribution.creator}
          </a>{' '}
          ·{' '}
        </>
      )}
      <a
        className="underline underline-offset-2 hover:text-white"
        href={attribution.sourceUrl}
        rel="noreferrer"
        target="_blank"
      >
        {attribution.sourceName}
      </a>{' '}
      ·{' '}
      <a
        className="underline underline-offset-2 hover:text-white"
        href={attribution.licenseUrl}
        rel="noreferrer"
        target="_blank"
      >
        {attribution.license}
      </a>
    </p>
  );
}

export function TripCover({
  onAddDestination,
  replaceCover,
  retryCover,
  trip
}: {
  onAddDestination: () => void;
  replaceCover: (cover: File) => Promise<boolean>;
  retryCover: () => Promise<boolean>;
  trip: TripDetail;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacing = useAsyncPending();
  const retrying = useAsyncPending();
  const replaceSelectedCover = async (cover: File | undefined) => {
    if (!cover) return;
    await replacing.run(async () => {
      await replaceCover(cover);
    });
    if (inputRef.current) inputRef.current.value = '';
  };
  const retryAutomaticCover = async () => {
    await retrying.run(async () => {
      await retryCover();
    });
  };

  return (
    <LiftCard asChild className="relative min-h-40 sm:min-h-48 md:aspect-[21/9] md:min-h-0">
      <section>
        <CoverVisual onAddDestination={onAddDestination} trip={trip} />

        {trip.permissions.canEditCover && (
          <>
            <Input
              accept="image/avif,image/jpeg,image/png,image/webp"
              aria-label="Choose replacement cover image"
              className="sr-only"
              disabled={replacing.isPending}
              onChange={(event) => void replaceSelectedCover(event.target.files?.[0])}
              ref={inputRef}
              type="file"
            />
            <div className="absolute right-3 top-3 flex gap-2">
              {trip.coverStatus !== 'pending' &&
                (trip.coverStatus === 'failed' || trip.coverAttribution !== null) && (
                  <Button
                    aria-label={trip.coverStatus === 'failed' ? 'Retry cover' : 'Find a new cover'}
                    className="border-border bg-background/85 backdrop-blur hover:bg-background"
                    disabled={replacing.isPending || retrying.isPending}
                    onClick={() => void retryAutomaticCover()}
                    size="icon-sm"
                    variant="outline"
                  >
                    {retrying.isPending ? <Spinner /> : <RotateCcw />}
                  </Button>
                )}
              <Button
                aria-label="Upload cover"
                className="border-border bg-background/85 backdrop-blur hover:bg-background"
                disabled={replacing.isPending || retrying.isPending}
                onClick={() => inputRef.current?.click()}
                size="icon-sm"
                variant="outline"
              >
                {replacing.isPending ? <Spinner /> : <Camera />}
              </Button>
            </div>
          </>
        )}

        <CoverAttribution attribution={trip.coverAttribution} />
      </section>
    </LiftCard>
  );
}
