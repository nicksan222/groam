import { FileText, Music, Video } from 'lucide-react';
import { formatBytes } from '@/features/trips/hooks/version-format';
import type { VisualDiffField } from './proposal-types';

export function MediaDiffValue({ media }: { media: VisualDiffField['mediaAfter'] }) {
  if (media.length === 0) return <span>None</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {media.map((item) => (
        <a
          className="flex min-w-0 max-w-full items-center gap-2 rounded-md border bg-background p-1.5 pr-2 hover:bg-muted/40"
          href={item.url ?? undefined}
          key={item.id}
          rel="noreferrer"
          target="_blank"
        >
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-muted">
            {item.url && item.contentType.startsWith('image/') ? (
              <img alt="" className="size-full object-cover" loading="lazy" src={item.url} />
            ) : item.contentType.startsWith('video/') ? (
              <Video className="size-4 text-muted-foreground" />
            ) : item.contentType.startsWith('audio/') ? (
              <Music className="size-4 text-muted-foreground" />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">{item.name}</span>
            <span className="block text-[10px] text-muted-foreground">
              {formatBytes(item.size)}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
