import { MAX_TRIP_NAME_LENGTH } from '@groam/backend/convex/modules/travel/trips/lengths';
import { MapPinned } from '@groam/icons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@groam/ui/components/collapsible';
import { FormField } from '@groam/ui/components/form-field';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { OptionalMark } from '@groam/ui/components/optional-mark';
import { useState } from 'react';
import { TripDestinationPicker } from '@/features/trips/trip-destinations/trip-destination-picker';
import type { TripInformationErrors } from '@/features/trips/trip-forms/trip-information-errors';
import { TripMoneySection } from '@/features/trips/trip-forms/trip-money-section';
import { TripWhenSection } from '@/features/trips/trip-forms/trip-when-section';
import { testIds } from '@/lib/test-ids';
import type { InformationSetter, TripInformationFormState } from '@/types/trips';

export type { InformationSetter, TripInformationFormState };

export function TripInformationFields({
  disabled,
  errors,
  setValue,
  value
}: {
  disabled: boolean;
  errors?: TripInformationErrors;
  setValue: InformationSetter;
  value: TripInformationFormState;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  // An error opens the section and it stays open, so a disabled submit always shows why and the
  // field does not vanish while the reader fixes it.
  if (Boolean(errors?.budget || errors?.totalDuration) && !detailsOpen) setDetailsOpen(true);
  return (
    <div className="space-y-4">
      <FormField label="Trip name" maxLength={MAX_TRIP_NAME_LENGTH} required>
        <Input
          autoFocus
          data-testid={testIds.createTripName}
          disabled={disabled}
          onChange={(event) => setValue('name', event.target.value)}
          placeholder="e.g. A weekend in Lisbon"
          value={value.name}
        />
      </FormField>

      <FormSection
        description="Somewhere in mind? You can decide later, too."
        icon={MapPinned}
        legend="Where"
        separated
      >
        <FormField label="Destination">
          <TripDestinationPicker
            disabled={disabled}
            onChange={(status, destination) => {
              setValue('destinationStatus', status);
              setValue('destination', destination);
            }}
            status={value.destinationStatus}
            value={value.destination}
          />
        </FormField>
      </FormSection>

      <Collapsible
        className="rounded-xl border border-border"
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
      >
        <CollapsibleTrigger className="flex w-full gap-3 rounded-xl px-4 py-4 text-left text-sm font-medium transition-colors hover:bg-muted/40">
          <span className="flex-1">Add dates and budget</span>
          <span className="text-xs font-normal text-muted-foreground">
            <OptionalMark />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent keepMounted className="space-y-6 px-4 pb-4">
          <TripWhenSection
            dateNotesTestId={testIds.createTripDateNotes}
            disabled={disabled}
            durationError={errors?.totalDuration}
            durationTestId={testIds.createTripDuration}
            separated
            setValue={setValue}
            startDateTestId={testIds.createTripStartDate}
            value={value}
          />
          <TripMoneySection
            budgetError={errors?.budget}
            budgetTestId={testIds.createTripBudget}
            disabled={disabled}
            separated
            setValue={setValue}
            value={value}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
