import { cn } from '@groam/ui/lib/utils';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

export function EditorDestinationPhoto({
  src,
  name,
  className
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = src && src !== failedSource;
  return (
    <span className={cn('relative block overflow-hidden bg-muted', className)}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(src)}
          className="size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
        />
      ) : (
        <span
          aria-hidden={!name || undefined}
          aria-label={name ? `${name} · Photo unavailable` : undefined}
          role="img"
          className="relative flex size-full items-center justify-center overflow-hidden bg-primary/5"
        >
          <span
            aria-hidden="true"
            className="absolute size-24 rounded-full border border-primary/10"
          />
          <span
            aria-hidden="true"
            className="absolute size-40 rounded-full border border-primary/10"
          />
          <MapPin aria-hidden="true" className="relative size-6 text-primary/50" />
        </span>
      )}
    </span>
  );
}
