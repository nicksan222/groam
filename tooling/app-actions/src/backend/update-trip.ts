import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { UpdateTripAction } from '#src/actions/update-trip';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const updateTrip: UpdateTripAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend updateTrip action requires tripId');
  const tripId = input.tripId as Id<'trips'>;
  const client = await authenticatedClient(backend, user);
  const current = await client.query(api.routes.trips.get.run, { tripId });
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

  await client.mutation(api.routes.trips.update.run, {
    input: {
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
    },
    tripId
  });
};
