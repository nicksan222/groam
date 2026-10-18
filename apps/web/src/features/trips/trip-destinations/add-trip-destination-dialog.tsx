import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { type FormEvent, useState } from 'react';
import type { TripDestinationInput } from '@/features/trips/hooks/use-trips';
import type { TripLocation } from '@/features/trips/trip-location';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';
import { AddTripDestinationSearch } from './add-trip-destination-search';

export function AddTripDestinationDialog({
  addDestination,
  firstDestination = false,
  onClose
}: {
  addDestination: (input: TripDestinationInput) => Promise<boolean>;
  firstDestination?: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<TripLocation | null>(null);
  const [dayNotes, setDayNotes] = useState('');
  const adding = useAsyncPending();

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    await adding.run(async () => {
      const added = await addDestination({
        ...(selected.countryCode ? { countryCode: selected.countryCode } : {}),
        ...(dayNotes ? { dayNotes } : {}),
        coordinates: { latitude: selected.latitude, longitude: selected.longitude },
        name: selected.name,
        placeId: selected.placeId,
        status: 'known'
      });
      if (added) onClose();
    });
  };

  return (
    <FormDialog
      contentClassName="sm:max-w-2xl"
      description="Choose a place and add any notes. You can set its trip days after saving."
      isPending={adding.isPending}
      onClose={() => {
        if (!adding.isPending) onClose();
      }}
      onSubmit={(event) => void add(event)}
      open
      submitDisabled={!selected}
      submitLabel={firstDestination ? 'Add first destination' : 'Add destination'}
      testId={testIds.addStopDialog}
      title={firstDestination ? 'Add your first destination' : 'Add a destination'}
    >
      <FormField label="Destination">
        <AddTripDestinationSearch
          disabled={adding.isPending}
          onSelect={setSelected}
          selected={selected}
        />
      </FormField>
      <FormField label="Notes (optional)">
        <Input
          disabled={adding.isPending}
          maxLength={240}
          onChange={(event) => setDayNotes(event.target.value)}
          placeholder="Food, neighborhoods, beaches…"
          data-testid={testIds.addStopPlans}
          value={dayNotes}
        />
      </FormField>
    </FormDialog>
  );
}
