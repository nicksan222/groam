import { MAX_DESTINATION_NOTES_LENGTH } from '@groam/backend/convex/modules/travel/destinations/lengths';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import type { TripDestinationInput } from '@/features/trips/hooks/use-trips';
import type { TripLocation } from '@/features/trips/trip-location';
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
  const form = useFormSubmit();

  const add = form.handle(async () => {
    if (!selected) return;
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

  return (
    <FormDialog
      contentClassName="sm:max-w-2xl"
      description="Choose a place and add any notes. You can set its trip days after saving."
      error={form.error}
      isPending={form.isPending}
      onClose={() => {
        if (!form.isPending) onClose();
      }}
      onSubmit={add}
      open
      submitDisabled={!selected}
      submitLabel={firstDestination ? 'Add first destination' : 'Add destination'}
      testId={testIds.addStopDialog}
      title={firstDestination ? 'Add your first destination' : 'Add a destination'}
    >
      <FormField label="Destination">
        <AddTripDestinationSearch
          disabled={form.isPending}
          onSelect={setSelected}
          selected={selected}
        />
      </FormField>
      <FormField label="Notes" maxLength={MAX_DESTINATION_NOTES_LENGTH} optional>
        <Input
          disabled={form.isPending}
          onChange={(event) => setDayNotes(event.target.value)}
          placeholder="Food, neighborhoods, beaches…"
          data-testid={testIds.addStopPlans}
          value={dayNotes}
        />
      </FormField>
    </FormDialog>
  );
}
