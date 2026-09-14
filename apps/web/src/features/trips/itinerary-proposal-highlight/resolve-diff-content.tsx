import { cn } from '@groam/ui/lib/utils';
import { FileText } from 'lucide-react';
import type { ResolutionMedia } from '@/features/trips/hooks/detail-resolution-values';
import { formatBytes } from '@/features/trips/hooks/version-format';

export function ResolveDiffContent({
  value,
  media,
  files,
  tone = 'neutral'
}: {
  value: string;
  media: boolean;
  files: ResolutionMedia[];
  tone?: 'removed' | 'added' | 'neutral';
}) {
  if (media)
    return (
      <div className="space-y-2 p-4">
        {files.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No files</p>
        ) : (
          files.map((file) => (
            <div className="flex items-start gap-3" key={file.id}>
              <span
                className={cn(
                  'mt-1 font-mono text-xs',
                  tone === 'removed' ? 'text-destructive-foreground' : 'text-primary'
                )}
              >
                {tone === 'removed' ? '−' : tone === 'added' ? '+' : '·'}
              </span>
              {file.url && file.contentType.startsWith('image/') ? (
                <img
                  alt={file.name}
                  className="h-24 w-32 shrink-0 rounded-md border border-border object-cover"
                  src={file.url}
                />
              ) : (
                <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <a
                  className="break-all text-xs font-medium underline-offset-4 hover:underline"
                  href={file.url ?? undefined}
                  rel="noreferrer"
                  target="_blank"
                >
                  {file.name}
                </a>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {file.size > 0 ? formatBytes(file.size) : 'Image preview'}
                  {!file.url && ' · Preview unavailable'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    );
  return (
    <div className="py-3 font-mono text-xs leading-6">
      {value.split('\n').map((line, index) => (
        <div className="flex" key={`${index}:${line}`}>
          <span
            aria-hidden
            className="w-9 shrink-0 select-none text-right text-muted-foreground/50"
          >
            {index + 1}
          </span>
          <span
            aria-hidden
            className={cn(
              'w-8 shrink-0 text-center',
              tone === 'removed' ? 'text-destructive-foreground' : 'text-primary'
            )}
          >
            {tone === 'removed' ? '−' : tone === 'added' ? '+' : ' '}
          </span>
          <span className="min-w-0 whitespace-pre-wrap break-words pr-4">{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}
