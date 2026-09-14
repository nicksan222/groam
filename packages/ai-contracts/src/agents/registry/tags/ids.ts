import type { GenericId } from 'convex/values';

export const assistantContextTagKinds = ['trip', 'destination', 'activity'] as const;
export type AssistantContextTagKind = (typeof assistantContextTagKinds)[number];
export type AssistantContextTagTable = 'trips' | 'tripDestinations' | 'tripDestinationActivities';

export type AssistantContextTagMutationReference =
  | { id: GenericId<'trips'>; kind: 'trip' }
  | { id: GenericId<'tripDestinations'>; kind: 'destination' }
  | { id: GenericId<'tripDestinationActivities'>; kind: 'activity' };
