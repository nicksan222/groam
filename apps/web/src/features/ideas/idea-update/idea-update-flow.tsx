import { ArrowLeftRight, Check } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Heading } from '@groam/ui/components/heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import {
  ideaChooseWhatToKeep,
  ideaKeepMyIdea,
  ideaKeepSharedTrip,
  ideaUpdateConfirm,
  ideaUpdateFromSharedTrip
} from '@/features/ideas/idea-glossary';
import type { IdeaStatus } from '@/features/ideas/idea-href';
import {
  type IdeaRebaseChoice,
  type IdeaRebaseConflict,
  type IdeaRebaseResult,
  rebaseBlockedReason,
  rebaseExplanation,
  useIdeaRebaseReconciliation
} from '@/features/trips/hooks/use-idea-rebase-reconciliation';
import { TripInlineNotice } from '@/features/trips/trip-detail/trip-inline-notice';
import { testIds } from '@/lib/test-ids';

export function IdeaUpdateFlow({
  canRebase,
  disabled,
  onRebase,
  pending,
  sourceChanged,
  status
}: {
  canRebase: boolean;
  disabled: boolean;
  onRebase: (
    resolutions?: Array<{ choice: IdeaRebaseChoice; path: string }>
  ) => Promise<IdeaRebaseResult | null>;
  pending: boolean;
  sourceChanged: boolean;
  status: IdeaStatus;
}) {
  const screen = useIdeaRebaseReconciliation();
  const showEntry =
    status === 'conflicted' || (sourceChanged && status !== 'merged' && status !== 'closed');
  if (!showEntry && !screen.open) return null;

  const start = async () => {
    const result = await onRebase();
    if (!result || result.kind === 'applied' || result.conflicts.length === 0) return;
    screen.start(result.conflicts);
  };

  const apply = async () => {
    const result = screen.applyIfComplete();
    if (!result.completed) return;
    const applied = await onRebase(result.resolutions);
    if (applied?.kind === 'applied') screen.close();
  };

  if (screen.open && screen.steps.length > 0) {
    return (
      <IdeaUpdateScreen
        choices={screen.choices}
        disabled={disabled}
        onCancel={screen.close}
        onChoose={screen.setChoice}
        onApply={() => void apply()}
        pending={pending}
        steps={screen.steps}
      />
    );
  }

  if (!showEntry) return null;

  return (
    <IdeaUpdateEntry
      canRebase={canRebase}
      conflicted={status === 'conflicted'}
      disabled={disabled}
      onStart={() => void start()}
      pending={pending}
    />
  );
}

function IdeaUpdateEntry({
  canRebase,
  conflicted,
  disabled,
  onStart,
  pending
}: {
  canRebase: boolean;
  conflicted: boolean;
  disabled: boolean;
  onStart: () => void;
  pending: boolean;
}) {
  const blockedReason = rebaseBlockedReason(canRebase);
  return (
    <TripInlineNotice
      action={
        <Button
          data-testid={testIds.ideaUpdateFromShared}
          disabled={disabled || !canRebase}
          onClick={onStart}
          pending={pending}
          size="sm"
          variant={conflicted ? 'default' : 'outline'}
        >
          <ArrowLeftRight />
          {ideaUpdateFromSharedTrip}
        </Button>
      }
      icon={ArrowLeftRight}
      title="The shared trip has changed since you started"
    >
      <p>Update your idea before applying it. Changes that do not overlap combine automatically.</p>
      {blockedReason && <p className="mt-1">{blockedReason}</p>}
    </TripInlineNotice>
  );
}

function IdeaUpdateScreen({
  choices,
  disabled,
  onApply,
  onCancel,
  onChoose,
  pending,
  steps
}: {
  choices: Record<string, IdeaRebaseChoice>;
  disabled: boolean;
  onApply: () => void;
  onCancel: () => void;
  onChoose: (key: string, choice: IdeaRebaseChoice) => void;
  pending: boolean;
  steps: IdeaRebaseConflict[];
}) {
  const ready = steps.every((step) => choices[step.key] !== undefined);
  return (
    <section
      aria-labelledby="idea-update-heading"
      className="mx-6 mt-4 space-y-4 rounded-lg bg-muted/40 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level={3} size="sm" id="idea-update-heading">
            {ideaChooseWhatToKeep}
          </Heading>
          <MutedCopy size="xs" className="mt-1">
            Choose the shared trip or this idea for each overlapping edit.
          </MutedCopy>
        </div>
        <Button disabled={pending} onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
      <div className="space-y-3">
        {steps.map((conflict) => (
          <div className="rounded-lg border p-3" key={conflict.key}>
            <p className="text-sm font-medium">{conflict.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{rebaseExplanation(conflict)}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <UpdateChoice
                checked={choices[conflict.key] === 'current'}
                description={conflict.currentSummary}
                disabled={disabled}
                label={ideaKeepSharedTrip}
                onClick={() => onChoose(conflict.key, 'current')}
              />
              <UpdateChoice
                checked={choices[conflict.key] === 'proposed'}
                description={conflict.proposedSummary}
                disabled={disabled}
                label={ideaKeepMyIdea}
                onClick={() => onChoose(conflict.key, 'proposed')}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button disabled={disabled || !ready} onClick={onApply} pending={pending} size="sm">
          {ideaUpdateConfirm}
        </Button>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">
        This updates only your idea. The shared trip stays unchanged.
      </p>
    </section>
  );
}

function UpdateChoice({
  checked,
  description,
  disabled,
  label,
  onClick
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={checked}
      className={`rounded-lg border p-3 text-left transition-colors ${
        checked ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      unstyled
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`grid size-4 place-items-center rounded-full border ${
            checked ? 'border-primary bg-primary text-primary-foreground' : ''
          }`}
        >
          {checked && <Check className="size-2.5" />}
        </span>
        {label}
      </span>
      <span className="mt-2 block pl-6 text-xs leading-4 text-muted-foreground">{description}</span>
    </Button>
  );
}
