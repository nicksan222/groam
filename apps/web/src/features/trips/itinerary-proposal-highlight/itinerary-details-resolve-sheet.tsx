import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDot,
  Columns2,
  GitMerge,
  ListChecks
} from 'lucide-react';
import { useState } from 'react';
import type { ResolutionRow } from '@/features/trips/hooks/detail-resolution-values';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { DetailsResolveChoice } from '@/types/trips';
import { ResolveBranchHeader } from './resolve-branch-header';
import { ResolveDiffField } from './resolve-diff-field';
import { ResolveResultPreview } from './resolve-result-preview';

export function ItineraryDetailsResolveSheet({
  applyChoices,
  canResolve,
  dataReady,
  fieldKeys,
  ideaBranchName,
  onOpenChange,
  open,
  otherConflicts,
  pending,
  proposalId,
  resolveRows,
  revision,
  sharedBranchName,
  sourceTripId
}: {
  applyChoices: (choices: Record<string, DetailsResolveChoice>) => Promise<boolean>;
  canResolve: boolean;
  dataReady: boolean;
  fieldKeys: string[];
  ideaBranchName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  otherConflicts: number;
  pending: boolean;
  proposalId?: Id<'tripProposals'>;
  resolveRows: ResolutionRow[];
  revision: string;
  sharedBranchName: string;
  sourceTripId: Id<'trips'>;
}) {
  const [selection, setSelection] = useState<{
    revision: string;
    choices: Record<string, DetailsResolveChoice>;
  }>({ revision, choices: {} });
  const [view, setView] = useState<'diff' | 'result'>('diff');
  const changed = selection.revision !== revision;
  const choices = changed ? {} : selection.choices;
  const selectedCount = fieldKeys.filter((key) => choices[key]).length;
  const complete = dataReady && fieldKeys.length > 0 && selectedCount === fieldKeys.length;
  const disabled = pending || !canResolve || !dataReady;
  const choose = (key: string, choice: DetailsResolveChoice) =>
    setSelection({ revision, choices: { ...choices, [key]: choice } });
  const chooseAll = (choice: DetailsResolveChoice) =>
    setSelection({ revision, choices: Object.fromEntries(fieldKeys.map((key) => [key, choice])) });
  const setOpen = (next: boolean) => {
    if (pending) return;
    setSelection({ revision, choices: {} });
    setView('diff');
    onOpenChange(next);
  };
  const apply = async () => {
    if (complete && (await applyChoices(choices))) setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-busy={pending}
        className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <ResolveSheetPendingOverlay pending={pending} />
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <GitMerge className="size-5 text-primary" />
            Choose what to keep — trip details
          </DialogTitle>
          <DialogDescription>
            The left side is the group’s current plan. The right side is your idea. Choose what to
            keep, then review the result.
          </DialogDescription>
          <ResolveBranchHeader
            ideaBranchName={ideaBranchName}
            sharedBranchName={sharedBranchName}
          />
        </DialogHeader>
        <ResolveSheetControls
          disabled={disabled}
          onChooseAll={chooseAll}
          onViewChange={setView}
          pending={pending}
          view={view}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav
            aria-label="Changed fields"
            className="hidden w-44 shrink-0 overflow-y-auto border-r border-border p-3 lg:block"
          >
            <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Changed details
            </p>
            {resolveRows.map((row) => (
              <Button
                disabled={pending}
                type="button"
                key={row.key}
                onClick={() => {
                  setView('diff');
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`resolve-${row.key}`)
                      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                  );
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                unstyled
              >
                {choices[row.key] ? (
                  <Check className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <CircleDot className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {row.label}
              </Button>
            ))}
          </nav>
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <ResolveSheetRevisionNotice changed={changed} choices={selection.choices} />
            {otherConflicts > 0 && proposalId && (
              <p className="text-xs text-muted-foreground">
                {otherConflicts} other itinerary conflicts need review.{' '}
                <Link
                  aria-disabled={pending}
                  tabIndex={pending ? -1 : undefined}
                  onClick={(event) => {
                    if (pending) event.preventDefault();
                  }}
                  className={cn(
                    'font-medium text-primary underline underline-offset-4',
                    pending && 'pointer-events-none opacity-50'
                  )}
                  to="/trips/$tripId/ideas/$proposalId/$view"
                  params={{ tripId: sourceTripId, proposalId, view: 'compare' }}
                >
                  Open comparison
                </Link>
              </p>
            )}
            {!dataReady ? (
              <p role="status" className="py-12 text-center text-sm text-muted-foreground">
                Loading the shared trip and this idea…
              </p>
            ) : view === 'diff' ? (
              resolveRows.map((row) => (
                <ResolveDiffField
                  ideaBranchName={ideaBranchName}
                  key={row.key}
                  row={row}
                  sharedBranchName={sharedBranchName}
                  choice={choices[row.key]}
                  disabled={disabled}
                  onChoose={(choice) => choose(row.key, choice)}
                />
              ))
            ) : (
              <ResolveResultPreview
                rows={resolveRows}
                choices={choices}
                ideaBranchName={ideaBranchName}
                sharedBranchName={sharedBranchName}
              />
            )}
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
          <div>
            <p aria-live="polite" className={cn('text-xs font-medium', complete && 'text-primary')}>
              {selectedCount} of {fieldKeys.length} details selected
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Applies to this idea. The shared trip stays unchanged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {view === 'result' ? (
              <>
                <Button variant="outline" disabled={pending} onClick={() => setView('diff')}>
                  <ArrowLeft className="size-3.5" />
                  Back to diff
                </Button>
                <Button
                  data-testid={testIds.itineraryDetailsResolveApply}
                  disabled={disabled || !complete}
                  onClick={apply}
                >
                  {pending ? 'Applying…' : 'Apply choices'}
                  <Check className="size-3.5" />
                </Button>
              </>
            ) : (
              <Button disabled={pending || !complete} onClick={() => setView('result')}>
                Review result
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function ResolveSheetPendingOverlay({ pending }: { pending: boolean }) {
  if (!pending) return null;
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur-sm"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4 shadow-lg">
        <Spinner className="size-5" />
        <div>
          <p className="text-sm font-semibold">Applying your choices…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Updating your idea and its files.</p>
        </div>
      </div>
    </div>
  );
}

function ResolveSheetControls({
  disabled,
  onChooseAll,
  onViewChange,
  pending,
  view
}: {
  disabled: boolean;
  onChooseAll: (choice: DetailsResolveChoice) => void;
  onViewChange: (view: 'diff' | 'result') => void;
  pending: boolean;
  view: 'diff' | 'result';
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-6">
      <fieldset className="flex gap-1 rounded-lg border border-border p-1">
        <legend className="sr-only">Diff view</legend>
        <Button
          aria-pressed={view === 'diff'}
          disabled={pending}
          onClick={() => onViewChange('diff')}
          size="sm"
          variant={view === 'diff' ? 'secondary' : 'ghost'}
        >
          <Columns2 className="size-3.5" />
          Split diff
        </Button>
        <Button
          aria-pressed={view === 'result'}
          disabled={pending}
          onClick={() => onViewChange('result')}
          size="sm"
          variant={view === 'result' ? 'secondary' : 'ghost'}
        >
          <ListChecks className="size-3.5" />
          Result preview
        </Button>
      </fieldset>
      <div className="flex gap-2">
        <Button
          disabled={disabled}
          onClick={() => onChooseAll('shared')}
          size="sm"
          variant="outline"
        >
          Use all shared
        </Button>
        <Button disabled={disabled} onClick={() => onChooseAll('mine')} size="sm" variant="outline">
          Keep all mine
        </Button>
      </div>
    </div>
  );
}

function ResolveSheetRevisionNotice({
  changed,
  choices
}: {
  changed: boolean;
  choices: Record<string, DetailsResolveChoice>;
}) {
  if (!changed || Object.keys(choices).length === 0) return null;
  return (
    <p className="rounded-lg border border-warning/40 px-4 py-3 text-sm" role="alert">
      The trip changed during your review. Your choices were cleared so you can review the latest
      values.
    </p>
  );
}
