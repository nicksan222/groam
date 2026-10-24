import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';
import type { TripListItem } from '@/types/trips';

/** What waits on the viewer across their trips: per-trip counts and one capped list. */
export type TripsTurn = FunctionReturnType<typeof api.routes.trips.turn.run>;

export type TurnItem = TripsTurn['items'][number];

export type TripTurnCounts = TripsTurn['trips'][number];

export type DashboardPresentation =
  | { kind: 'archived' }
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'ready'; trips: TripListItem[] };
