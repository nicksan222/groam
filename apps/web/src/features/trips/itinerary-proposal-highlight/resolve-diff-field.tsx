import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { Check, CircleDot, GitBranch } from 'lucide-react';
import type { ResolutionRow } from '@/features/trips/hooks/detail-resolution-values';
import type { DetailsResolveChoice } from '@/types/trips';
import { ResolveDiffContent } from './resolve-diff-content';

export function ResolveDiffField({
  row,
  choice,
  disabled,
  ideaBranchName,
  onChoose,
  sharedBranchName
}: {
  row: ResolutionRow;
  choice?: DetailsResolveChoice;
  disabled: boolean;
  ideaBranchName: string;
  onChoose: (choice: DetailsResolveChoice) => void;
  sharedBranchName: string;
}) {
  const identical = row.media
    ? row.mineMedia.map(({ id }) => id).join() === row.sharedMedia.map(({ id }) => id).join()
    : row.mine === row.shared;
  return (
    <section
      aria-label={`${row.label} diff`}
      className={cn(
        'scroll-mt-4 overflow-hidden rounded-lg border',
        choice ? 'border-primary/40' : 'border-border'
      )}
      id={`resolve-${row.key}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4 text-muted-foreground" />
          {row.label}
        </h3>
        <span
          className={cn(
            'flex items-center gap-1.5 text-[11px]',
            choice ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {choice ? <Check className="size-3.5" /> : <CircleDot className="size-3.5" />}
          {choice
            ? `Keeping ${choice === 'mine' ? 'this idea' : 'shared trip'}`
            : identical
              ? 'Same on both sides'
              : 'Choose what to keep'}
        </span>
      </header>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {(['shared', 'mine'] as const).map((side) => {
          const selected = choice === side;
          const mine = side === 'mine';
          const branchLabel = mine ? 'This idea' : 'Shared trip';
          const branchName = mine ? ideaBranchName : sharedBranchName;
          return (
            <section
              aria-label={`${branchLabel} branch for ${row.label}`}
              className="min-w-0"
              key={side}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                <div className="min-w-0">
                  <span className={cn('text-xs font-semibold', mine && 'text-primary')}>
                    {branchLabel}
                  </span>
                  <p className="truncate text-[10px] text-muted-foreground">{branchName}</p>
                </div>
                <Button
                  aria-label={`${mine ? 'Keep my idea' : 'Keep shared trip'} for ${row.label}`}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onChoose(side)}
                  size="sm"
                  variant={selected ? 'default' : 'ghost'}
                >
                  {selected && <Check className="size-3" />}
                  {mine ? 'Keep my idea' : 'Keep shared trip'}
                </Button>
              </div>
              <div
                className={cn(
                  'min-h-24',
                  !identical && (mine ? 'bg-primary/5' : 'bg-destructive/5')
                )}
              >
                <ResolveDiffContent
                  files={mine ? row.mineMedia : row.sharedMedia}
                  media={row.media}
                  tone={identical ? 'neutral' : mine ? 'added' : 'removed'}
                  value={mine ? row.mine : row.shared}
                />
              </div>
            </section>
          );
        })}
      </div>
      {choice && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <Check className="size-3.5 text-primary" />
          Result takes this field from {choice === 'mine' ? 'this idea' : 'the shared trip'}.
        </div>
      )}
    </section>
  );
}
