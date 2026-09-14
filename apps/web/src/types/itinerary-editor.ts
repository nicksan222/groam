import type { Id } from '@groam/backend/data-model';
import type { PlannerPeriod } from '@/types/trip-planner';
import type {
  MoveDestination,
  TripActivityActions,
  TripDetail,
  TripStayActions,
  TripUpdateInput,
  UpdateDestination
} from '@/types/trips';

export type ItineraryEditorProps = {
  activityActions: TripActivityActions;
  stayActions: TripStayActions;
  trip: TripDetail;
  moveDestination: MoveDestination;
  updateDestination: UpdateDestination;
  removeDestination: (id: Id<'tripDestinations'>) => Promise<boolean>;
  updateTrip: (input: TripUpdateInput) => Promise<boolean>;
  onAddDestination?: () => void;
  onOpenOverview: () => void;
};
export type ItineraryEditorMode = 'day' | 'route' | 'stays' | 'travel';
export type EditorActivitySelection = {
  destinationId: Id<'tripDestinations'>;
  activityId?: Id<'tripDestinationActivities'>;
  day: number;
  period: PlannerPeriod;
};
