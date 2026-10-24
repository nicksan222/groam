import { MAX_TRIP_NAME_LENGTH } from '@groam/backend/convex/modules/travel/trips/lengths';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import { ideaEditDetails } from '@/features/ideas/idea-glossary';
import type { TripDetail, TripUpdateInput } from '@/features/trips/hooks/use-trips';
import { tripDurationInput } from '@/features/trips/trip-duration-input';
import { tripInformationErrors } from '@/features/trips/trip-forms/trip-information-errors';
import { TripMoneySection } from '@/features/trips/trip-forms/trip-money-section';
import { TripWhenSection } from '@/features/trips/trip-forms/trip-when-section';
import { testIds } from '@/lib/test-ids';
import type { InformationSetter, TripInformationFormState } from '@/types/trips';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type TripDetailsDraft = Pick<
  TripInformationFormState,
  'budget' | 'currency' | 'dateNotes' | 'name' | 'totalDuration'
>;

function valueOrUndefined(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

export function TripDetailsEditor({
  onClose,
  trip,
  update
}: {
  onClose: () => void;
  trip: TripDetail;
  update: (input: TripUpdateInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<TripDetailsDraft>(() => ({
    budget: trip.initialBudget?.toString() ?? '',
    currency: trip.currency,
    dateNotes: trip.dateNotes ?? '',
    name: trip.name,
    totalDuration: trip.totalDurationDays?.toString() ?? ''
  }));
  const form = useFormSubmit();
  const errors = tripInformationErrors(draft);

  const setValue: InformationSetter = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const submit = form.handle(async () => {
    const budgetAmount = valueOrUndefined(draft.budget);
    const duration = tripDurationInput(trip, valueOrUndefined(draft.totalDuration));
    const updated = await update({
      ...(budgetAmount === undefined ? {} : { budget: { amount: budgetAmount } }),
      currency: draft.currency,
      dateNotes: draft.dateNotes.trim() || undefined,
      destination: trip.destination,
      ...(duration ? { duration } : {}),
      name: draft.name,
      ...(trip.startDate ? { startDate: trip.startDate } : {})
    });
    if (updated) onClose();
  });

  return (
    <FormDialog
      contentClassName="sm:max-w-2xl"
      description="Unknown dates and durations can stay empty. Changes are recorded in activity."
      error={form.error}
      isPending={form.isPending}
      onClose={() => {
        if (!form.isPending) onClose();
      }}
      onSubmit={submit}
      open
      size="tall"
      submitDisabled={!draft.name.trim() || Object.keys(errors).length > 0}
      submitLabel="Save changes"
      submitTestId={testIds.editTripSave}
      testId={testIds.editTripDialog}
      title={ideaEditDetails}
    >
      <FormField label="Trip name" maxLength={MAX_TRIP_NAME_LENGTH} required>
        <Input
          autoFocus
          data-testid={testIds.createTripName}
          disabled={form.isPending}
          onChange={(event) => setValue('name', event.target.value)}
          value={draft.name}
        />
      </FormField>
      <TripWhenSection
        dateNotesTestId={testIds.editTripDateNotes}
        disabled={form.isPending}
        durationError={errors.totalDuration}
        durationTestId={testIds.createTripDuration}
        separated
        setValue={setValue}
        value={draft}
      />
      <TripMoneySection
        budgetError={errors.budget}
        budgetTestId={testIds.editTripBudget}
        disabled={form.isPending}
        separated
        setValue={setValue}
        value={draft}
      />
    </FormDialog>
  );
}
