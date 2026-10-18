import { Check, CircleDot } from 'lucide-react';
import type { ResolutionRow } from '@/features/trips/hooks/detail-resolution-values';
import type { DetailsResolveChoice } from '@/types/trips';
import { ResolveDiffContent } from './resolve-diff-content';

export function ResolveResultPreview({
  rows,
  choices,
  ideaBranchName,
  sharedBranchName
}: {
  rows: ResolutionRow[];
  choices: Record<string, DetailsResolveChoice>;
  ideaBranchName: string;
  sharedBranchName: string;
}) {
  return (
    <section
      aria-label="Result preview"
      className="overflow-hidden rounded-lg border border-border"
    >
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">This idea after applying</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The exact values and files you selected. Other trip details and itinerary items stay as
          they are.
        </p>
      </header>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const choice = choices[row.key];
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between gap-3 px-4 pt-3">
                <span className="text-xs font-semibold">{row.label}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {choice ? (
                    <Check className="size-3 text-primary" />
                  ) : (
                    <CircleDot className="size-3" />
                  )}
                  {choice
                    ? choice === 'mine'
                      ? `From your idea · ${ideaBranchName}`
                      : `From shared trip · ${sharedBranchName}`
                    : 'Not selected'}
                </span>
              </div>
              {choice ? (
                <ResolveDiffContent
                  files={choice === 'mine' ? row.mineMedia : row.sharedMedia}
                  media={row.media}
                  value={choice === 'mine' ? row.mine : row.shared}
                />
              ) : (
                <p className="px-4 py-4 text-xs text-muted-foreground">
                  Choose what to keep in the split view.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
