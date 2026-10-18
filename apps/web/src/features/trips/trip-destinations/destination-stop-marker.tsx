import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { ImageIcon, MapPinned } from 'lucide-react';
import { useState } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';

export function DestinationStopMarker({
  coverStatus,
  coverUrl,
  name,
  onCoverError,
  titleOverlay = false,
  stop
}: {
  coverStatus: TripDetail['destinations'][number]['coverStatus'];
  coverUrl: string | null;
  name: string;
  onCoverError?: () => void;
  titleOverlay?: boolean;
  stop: number;
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(coverUrl && failedUrl === coverUrl);
  const loading = !failed && (coverUrl ? loadedUrl !== coverUrl : coverStatus === 'pending');
  return (
    <span className="relative block size-full" data-testid={testIds.tripRouteStopPhoto}>
      {coverUrl && !failed ? (
        <img
          alt=""
          className={cn(
            'size-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover/cover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none',
            loading ? 'opacity-0' : 'opacity-100'
          )}
          loading="lazy"
          onError={() => {
            setFailedUrl(coverUrl);
            onCoverError?.();
          }}
          onLoad={() => setLoadedUrl(coverUrl)}
          src={coverUrl}
        />
      ) : !loading ? (
        <span className="grid size-full place-items-center text-muted-foreground/50">
          <MapPinned aria-hidden className="size-7" />
        </span>
      ) : null}
      {loading && (
        <span
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-4 text-center',
            titleOverlay && 'pb-24'
          )}
          role="status"
        >
          <ImageIcon aria-hidden className="size-7 text-primary/60" />
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner aria-hidden className="size-3.5 shrink-0" />
            {coverUrl ? `Loading photo of ${name}…` : `Finding a photo of ${name}…`}
          </span>
        </span>
      )}
      <span className="absolute left-3 top-3 grid size-10 place-items-center rounded-full border border-border bg-background/95 text-xs font-semibold leading-none tabular-nums text-foreground shadow-sm backdrop-blur-md">
        {stop}
      </span>
      <span className="sr-only">
        Stop {stop}, {name}
      </span>
    </span>
  );
}
