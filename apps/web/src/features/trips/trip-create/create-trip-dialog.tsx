import type { Id } from '@groam/backend/data-model';
import { Users } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormSection } from '@groam/ui/components/form-section';
import { toast } from '@groam/ui/components/toast';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import type { CreateTripInput } from '@/features/trips/hooks/use-trips';
import { DEFAULT_TRIP_CURRENCY } from '@/features/trips/trip-forms/trip-currencies';
import { tripInformationErrors } from '@/features/trips/trip-forms/trip-information-errors';
import {
  TripInformationFields,
  type TripInformationFormState
} from '@/features/trips/trip-forms/trip-information-fields';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CreateTripDialogProps = {
  createTrip: (input: CreateTripInput, cover: File | null) => Promise<Id<'trips'> | null>;
  onClose: () => void;
  onCreated: (tripId: Id<'trips'>) => void;
};

const initialInformation: TripInformationFormState = {
  budget: '',
  currency: DEFAULT_TRIP_CURRENCY,
  dateNotes: '',
  destination: null,
  destinationStatus: 'undecided',
  name: '',
  startDate: '',
  totalDuration: ''
};

function optionalNumber(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}

export function CreateTripDialog({ createTrip, onClose, onCreated }: CreateTripDialogProps) {
  const { activeOrganization, session } = useWorkspace();
  const { openDialog } = useWorkspaceDialogs();
  const members = activeOrganization.members;
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [information, setInformation] = useState(initialInformation);
  const form = useFormSubmit();
  const errors = tripInformationErrors(information);

  function setInformationValue<Field extends keyof TripInformationFormState>(
    field: Field,
    value: TripInformationFormState[Field]
  ) {
    setInformation((current) => ({ ...current, [field]: value }));
  }

  const submit = form.handle(async () => {
    const budgetAmount = optionalNumber(information.budget);
    const totalDays = optionalNumber(information.totalDuration);
    const tripId = await createTrip(
      createTripInput({ budgetAmount, clientRequestId, information, totalDays }),
      null
    );
    if (tripId) {
      toast.success(`${information.name.trim()} is live.`);
      onCreated(tripId);
    }
  });

  return (
    <FormDialog
      description="A little idea, your next adventure. You can work out the details together."
      error={form.error}
      isPending={form.isPending}
      onClose={() => {
        if (!form.isPending) onClose();
      }}
      onSubmit={submit}
      open
      size="tall"
      submitDisabled={!information.name.trim() || Object.keys(errors).length > 0}
      submitLabel="Create trip"
      testId={testIds.createTripDialog}
      title="Create a trip"
    >
      <TripInformationFields
        disabled={form.isPending}
        errors={errors}
        setValue={setInformationValue}
        value={information}
      />
      <FormSection
        description="Shared with your group. Confirm travelers later."
        icon={Users}
        legend="Who’s coming"
        separated
      >
        <div className="flex max-h-28 flex-wrap items-center gap-2 overflow-y-auto pr-1">
          {members.map((member) => {
            const isYou = member.userId === session.user.id;
            return (
              <div
                className="max-w-40 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs"
                data-testid={testIds.createTripTraveler}
                key={member.userId}
              >
                <span className="block min-w-0 truncate">
                  {member.user.name}
                  {isYou ? ' (you)' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <Button
          className="text-left text-sm text-primary underline-offset-2 hover:underline"
          disabled={form.isPending}
          onClick={() => openDialog('invite')}
          type="button"
          unstyled
        >
          Invite to this group
        </Button>
      </FormSection>
    </FormDialog>
  );
}

function createTripInput({
  budgetAmount,
  clientRequestId,
  information,
  totalDays
}: {
  budgetAmount: number | undefined;
  clientRequestId: string;
  information: TripInformationFormState;
  totalDays: number | undefined;
}): CreateTripInput {
  const destination =
    information.destinationStatus === 'known' && information.destination
      ? knownDestination(information.destination)
      : { status: 'undecided' as const };
  return {
    clientRequestId,
    ...(budgetAmount === undefined ? {} : { budget: { amount: budgetAmount } }),
    currency: information.currency,
    dateNotes: information.dateNotes.trim() || undefined,
    destination,
    ...(totalDays === undefined ? {} : { duration: { totalDays } }),
    name: information.name,
    ...(information.startDate ? { startDate: information.startDate } : {})
  };
}

function knownDestination(destination: NonNullable<TripInformationFormState['destination']>) {
  return {
    ...(destination.countryCode ? { countryCode: destination.countryCode } : {}),
    coordinates: { latitude: destination.latitude, longitude: destination.longitude },
    name: destination.name,
    placeId: destination.placeId,
    status: 'known' as const
  };
}
