import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { IconTile } from '@groam/ui/components/icon-tile';
import { toast } from '@groam/ui/components/toast';
import { Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { CreateTripInput } from '@/features/trips/hooks/use-trips';
import { DEFAULT_TRIP_CURRENCY } from '@/features/trips/trip-forms/trip-currencies';
import {
  TripInformationFields,
  type TripInformationFormState
} from '@/features/trips/trip-forms/trip-information-fields';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
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
  const [error, setError] = useState<string | null>(null);
  const submitting = useAsyncPending();

  function setInformationValue<Field extends keyof TripInformationFormState>(
    field: Field,
    value: TripInformationFormState[Field]
  ) {
    setInformation((current) => ({ ...current, [field]: value }));
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const budgetAmount = optionalNumber(information.budget);
    const totalDays = optionalNumber(information.totalDuration);
    if (information.budget.trim() && (budgetAmount === undefined || budgetAmount <= 0)) {
      setError('Enter a budget greater than zero, or leave it blank.');
      return;
    }
    if (information.totalDuration.trim() && (totalDays === undefined || totalDays < 1)) {
      setError('Enter a trip length of at least one day, or leave it blank.');
      return;
    }

    await submitting.run(async () => {
      const tripId = await createTrip(
        createTripInput({ budgetAmount, clientRequestId, information, totalDays }),
        null
      );
      if (tripId) {
        toast.success(`${information.name.trim()} is live.`);
        onCreated(tripId);
      }
    });
  };

  return (
    <FormDialog
      contentClassName="max-h-[90dvh] overflow-y-auto rounded-2xl p-0 sm:max-w-2xl"
      description="A little idea, your next adventure. You can work out the details together."
      error={error}
      formClassName="space-y-5 px-5 pt-6 sm:px-6 [&_[data-slot=dialog-header]]:pr-6 [&_[data-slot=dialog-header]]:text-left [&_[data-slot=dialog-footer]]:sticky [&_[data-slot=dialog-footer]]:bottom-0 [&_[data-slot=dialog-footer]]:z-10 [&_[data-slot=dialog-footer]]:border-t [&_[data-slot=dialog-footer]]:border-border [&_[data-slot=dialog-footer]]:bg-background [&_[data-slot=dialog-footer]]:py-4"
      isPending={submitting.isPending}
      onClose={() => {
        if (!submitting.isPending) onClose();
      }}
      onSubmit={(event) => void submit(event)}
      open
      submitDisabled={!information.name.trim()}
      submitLabel="Create trip"
      testId={testIds.createTripDialog}
      title="Create a trip"
    >
      <TripInformationFields
        disabled={submitting.isPending}
        setValue={setInformationValue}
        value={information}
      />
      <section className="min-w-0 space-y-3 border-t border-border/70 pt-5">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2.5">
          <IconTile aria-hidden size="sm">
            <Users className="size-3.5" />
          </IconTile>
          <div className="space-y-0.5 pt-0.5">
            <h3 className="text-sm font-semibold tracking-tight">Who’s coming</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Shared with your group. Confirm travelers later.
            </p>
          </div>
        </div>
        <div className="flex max-h-28 flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
          {members.map((member) => {
            const isYou = member.userId === session.user.id;
            return (
              <div
                className="max-w-40 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs"
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
          disabled={submitting.isPending}
          onClick={() => openDialog('invite')}
          type="button"
          unstyled
        >
          Invite to this group
        </Button>
      </section>
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
