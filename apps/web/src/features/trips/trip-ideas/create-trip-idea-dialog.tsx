import { MAX_IDEA_NAME_LENGTH } from '@groam/backend/convex/modules/travel/versions/lengths';
import type { Id } from '@groam/backend/data-model';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useState } from 'react';
import { IdeaCopyExplainer } from '@/features/ideas/idea-clone/idea-copy-explainer';
import {
  startIdeaDialogDescription,
  startIdeaDialogTitle,
  startIdeaSubmitLabel
} from '@/features/ideas/idea-page-copy';
import { TripRequiredDialog } from '@/features/trips/trip-create/trip-required-dialog';
import { TripSelectField } from '@/features/trips/trip-forms/trip-select-field';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreateTripIdeaDialogProps = {
  defaultTitle?: string;
  intentHint?: string;
  isCreating: boolean;
  onCreate: (title?: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSelectedTripIdChange?: (tripId: Id<'trips'> | '') => void;
  open: boolean;
  selectedTripId?: Id<'trips'> | '';
  sharedTripName?: string;
  tripsLoading?: boolean;
  trips?: Array<{ id: Id<'trips'>; name: string }>;
};

/** Starts a private idea from a trip; every opening begins with a fresh name draft. */
export function CreateTripIdeaDialog(props: CreateTripIdeaDialogProps) {
  const session = useOpenSession(props.open);
  const { onOpenChange, open, trips, tripsLoading = false } = props;
  if (!tripsLoading && trips?.length === 0)
    return <TripRequiredDialog open={open} onClose={() => onOpenChange(false)} purpose="idea" />;
  return <CreateTripIdeaForm key={session} {...props} />;
}

function CreateTripIdeaForm({
  defaultTitle = '',
  intentHint,
  isCreating,
  onCreate,
  onOpenChange,
  onSelectedTripIdChange,
  open,
  selectedTripId,
  sharedTripName,
  trips,
  tripsLoading = false
}: CreateTripIdeaDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const form = useFormSubmit();
  const isPending = isCreating || form.isPending;
  const needsTrip = trips !== undefined;
  const resolvedTripId = selectedTripId === '' ? undefined : selectedTripId;
  const selectedTripName = needsTrip
    ? trips.find((trip) => trip.id === resolvedTripId)?.name
    : sharedTripName;

  const close = () => {
    if (isPending) return;
    onOpenChange(false);
  };

  const submit = form.handle(async () => {
    if (needsTrip && !resolvedTripId) return;
    await onCreate(title.trim() || undefined);
  });

  return (
    <FormDialog
      contentClassName="sm:max-w-md"
      description={
        intentHint ? `${startIdeaDialogDescription} ${intentHint}` : startIdeaDialogDescription
      }
      error={form.error}
      isPending={isPending}
      onClose={close}
      onSubmit={submit}
      open={open}
      submitDisabled={needsTrip && !resolvedTripId}
      submitLabel={startIdeaSubmitLabel}
      testId={testIds.startIdeaDialog}
      title={startIdeaDialogTitle}
    >
      <IdeaCopyExplainer originalName={selectedTripName} />
      {needsTrip && onSelectedTripIdChange && (
        <TripSelectField
          disabled={isPending}
          loading={tripsLoading}
          onChange={onSelectedTripIdChange}
          trips={trips}
          value={resolvedTripId}
        />
      )}
      <FormField
        description="Leave blank and we’ll name the idea for you."
        label="What do you want to change?"
        optional
      >
        <Input
          autoComplete="off"
          autoFocus
          data-testid={testIds.startIdeaName}
          disabled={isPending}
          maxLength={MAX_IDEA_NAME_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Add two days on the coast"
          value={title}
        />
      </FormField>
    </FormDialog>
  );
}
