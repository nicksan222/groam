import type { Id } from '@groam/backend/data-model';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { type FormEvent, useState } from 'react';
import { IdeaCopyExplainer } from '@/features/ideas/idea-clone/idea-copy-explainer';
import {
  startIdeaDialogDescription,
  startIdeaDialogTitle,
  startIdeaSubmitLabel
} from '@/features/ideas/idea-list/idea-page-copy';
import { TripRequiredDialog } from '@/features/trips/trip-create/trip-required-dialog';
import { testIds } from '@/lib/test-ids';

export function CreateTripIdeaDialog({
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
}: {
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
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTitle(defaultTitle);
  }
  const needsTrip = trips !== undefined;
  const resolvedTripId = selectedTripId === '' ? undefined : selectedTripId;
  const selectedTripName = needsTrip
    ? trips.find((trip) => trip.id === resolvedTripId)?.name
    : sharedTripName;

  const close = () => {
    if (isCreating) return;
    setTitle('');
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (needsTrip && !resolvedTripId) return;
    const requestedTitle = title.trim();
    await onCreate(requestedTitle || undefined);
  };

  if (!tripsLoading && needsTrip && trips.length === 0)
    return <TripRequiredDialog open={open} onClose={close} purpose="idea" />;

  return (
    <FormDialog
      contentClassName="sm:max-w-md"
      description={
        intentHint ? `${startIdeaDialogDescription} ${intentHint}` : startIdeaDialogDescription
      }
      isPending={isCreating}
      onClose={close}
      onSubmit={(event) => void submit(event)}
      open={open}
      submitDisabled={needsTrip && !resolvedTripId}
      submitLabel={startIdeaSubmitLabel}
      testId={testIds.startIdeaDialog}
      title={startIdeaDialogTitle}
    >
      <IdeaCopyExplainer originalName={selectedTripName} />
      {needsTrip && onSelectedTripIdChange && (
        <FormField label="Trip" required>
          <Select
            disabled={tripsLoading || isCreating || trips.length === 0}
            onValueChange={(value) => onSelectedTripIdChange(value as Id<'trips'>)}
            value={resolvedTripId}
          >
            <SelectTrigger aria-label="Trip" className="w-full">
              <SelectValue placeholder={tripsLoading ? 'Loading trips…' : 'Choose a trip'} />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
      <FormField
        description="Optional. Leave blank and we’ll name the idea for you."
        label="What do you want to change?"
      >
        <Input
          autoComplete="off"
          autoFocus
          data-testid={testIds.startIdeaName}
          disabled={isCreating}
          maxLength={64}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add two days on the coast"
          value={title}
        />
      </FormField>
    </FormDialog>
  );
}
