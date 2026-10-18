import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { FunctionArgs } from 'convex/server';
import type { UpdateTripAction, UpdateTripInput } from '#src/actions/update-trip';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

type TripUpdateInput = FunctionArgs<typeof api.routes.trips.update.run>['input'];

export const updateTrip: UpdateTripAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend updateTrip action requires tripId');
  const tripId = input.tripId as Id<'trips'>;
  const client = await authenticatedClient(backend, user);
  const current = await client.query(api.routes.trips.get.run, { tripId });
  const existingDuration = currentDuration(current);
  await client.mutation(api.routes.trips.update.run, {
    input: updateInput(current, input, existingDuration),
    tripId
  });
};

function currentDuration(current: {
  idealDurationDays: number | null;
  minimumDurationDays: number | null;
  totalDurationDays: number | null;
}) {
  const existingDuration =
    current.idealDurationDays !== null ||
    current.minimumDurationDays !== null ||
    current.totalDurationDays !== null
      ? {
          ...(current.idealDurationDays === null ? {} : { idealDays: current.idealDurationDays }),
          ...(current.minimumDurationDays === null
            ? {}
            : { minimumDays: current.minimumDurationDays }),
          ...(current.totalDurationDays === null ? {} : { totalDays: current.totalDurationDays })
        }
      : undefined;
  return existingDuration;
}

function updateInput(
  current: {
    currency: TripUpdateInput['currency'];
    dateNotes: string | null;
    destination: TripUpdateInput['destination'];
    initialBudget: number | null;
    name: string;
    startDate: string | null;
  },
  input: UpdateTripInput,
  existingDuration: ReturnType<typeof currentDuration>
): TripUpdateInput {
  return {
    ...(input.budgetAmount === undefined
      ? current.initialBudget === null
        ? {}
        : { budget: { amount: current.initialBudget } }
      : { budget: { amount: input.budgetAmount } }),
    currency: current.currency,
    dateNotes: input.dateNotes ?? current.dateNotes ?? undefined,
    destination: current.destination,
    ...(input.durationDays === undefined
      ? existingDuration
        ? { duration: existingDuration }
        : {}
      : { duration: { totalDays: input.durationDays } }),
    name: input.name ?? current.name,
    ...(current.startDate ? { startDate: current.startDate } : {})
  };
}
