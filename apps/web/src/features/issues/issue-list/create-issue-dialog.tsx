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
import { Textarea } from '@groam/ui/components/textarea';
import { useState } from 'react';
import { useCreateIssue } from '@/features/issues/hooks/use-workspace-issues';
import { TripRequiredDialog } from '@/features/trips/trip-create/trip-required-dialog';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';

function TripField({
  disabled,
  loading,
  onChange,
  selectedTripId,
  show,
  trips
}: {
  disabled: boolean;
  loading: boolean;
  onChange: (tripId: Id<'trips'>) => void;
  selectedTripId: Id<'trips'> | '';
  show: boolean;
  trips?: Array<{ id: Id<'trips'>; name: string }>;
}) {
  if (!show) return null;
  return (
    <FormField label="Trip" required>
      <Select
        disabled={loading || disabled || !trips?.length}
        onValueChange={(value) => onChange(value as Id<'trips'>)}
        value={selectedTripId || undefined}
      >
        <SelectTrigger aria-label="Trip" className="w-full" data-testid={testIds.createIssueTrip}>
          <SelectValue placeholder={loading ? 'Loading trips…' : 'Choose a trip'} />
        </SelectTrigger>
        <SelectContent>
          {(trips ?? []).map((trip) => (
            <SelectItem key={trip.id} value={trip.id}>
              {trip.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function CreateIssueDialog({
  onClose,
  onCreated,
  open,
  tripId,
  trips,
  tripsLoading = false
}: {
  onClose: () => void;
  onCreated: (issueId: Id<'tripIssues'>) => void;
  open: boolean;
  tripId?: Id<'trips'>;
  tripsLoading?: boolean;
  trips?: Array<{ id: Id<'trips'>; name: string }>;
}) {
  const createIssue = useCreateIssue();
  const pending = useAsyncPending();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<Id<'trips'> | ''>(tripId ?? '');
  const resolvedTripId = tripId ?? (selectedTripId === '' ? undefined : selectedTripId);
  const needsTrip = tripId === undefined;

  const close = () => {
    if (pending.isPending) return;
    setTitle('');
    setBody('');
    setSelectedTripId(tripId ?? '');
    onClose();
  };

  const submit = async () => {
    if (!resolvedTripId) return;
    await pending.run(async () => {
      const issueId = await createIssue(resolvedTripId, title, body);
      if (issueId) {
        setTitle('');
        setBody('');
        setSelectedTripId(tripId ?? '');
        onCreated(issueId);
      }
    });
  };

  if (!tripsLoading && needsTrip && trips !== undefined && trips.length === 0)
    return <TripRequiredDialog open={open} onClose={close} purpose="issue" />;

  return (
    <FormDialog
      contentClassName="sm:max-w-lg"
      description="Describe a question, decision, or problem for the group to resolve."
      isPending={pending.isPending}
      onClose={close}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      open={open}
      submitDisabled={!title.trim() || !body.trim() || !resolvedTripId}
      submitLabel="Create issue"
      testId={testIds.createIssueDialog}
      title="New trip issue"
    >
      <TripField
        disabled={pending.isPending}
        loading={tripsLoading}
        onChange={setSelectedTripId}
        selectedTripId={selectedTripId}
        show={needsTrip}
        trips={trips}
      />
      <FormField label="What should change?" required>
        <Input
          autoFocus={!needsTrip}
          data-testid={testIds.createIssueTitle}
          disabled={pending.isPending}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a day trip to the itinerary"
          value={title}
        />
      </FormField>
      <FormField description={`${body.length}/5000 characters`} label="Description" required>
        <Textarea
          className="min-h-36 resize-none"
          data-testid={testIds.createIssueBody}
          disabled={pending.isPending}
          maxLength={5000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share the context, desired outcome, and anything reviewers should consider…"
          value={body}
        />
      </FormField>
    </FormDialog>
  );
}
