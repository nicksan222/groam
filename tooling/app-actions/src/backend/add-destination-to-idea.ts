import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { AddDestinationToIdeaAction } from '#src/actions/add-destination-to-idea';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';

export const addDestinationToIdea: AddDestinationToIdeaAction<{
  backend: BackendSession;
  user: AuthenticatedAppUser;
}> = async ({ backend, user }, input) => {
  if (!input.tripId) throw new Error('The backend addDestinationToIdea action requires tripId');
  if (input.latitude === undefined || input.longitude === undefined || !input.placeId) {
    throw new Error(
      'The backend addDestinationToIdea action requires latitude, longitude, and placeId'
    );
  }
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.trips.destinations.add.run, {
    tripId: input.tripId as Id<'trips'>,
    input: {
      coordinates: { latitude: input.latitude, longitude: input.longitude },
      countryCode: input.countryCode,
      name: input.label,
      dayNotes: input.notes,
      placeId: input.placeId,
      status: 'known'
    }
  });
};
