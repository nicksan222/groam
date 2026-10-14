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
export type EditorActivitySelection = {
  /** Opens a compact form beside the selected day instead of every optional field at once. */
  inline?: boolean;
  destinationId: Id<'tripDestinations'>;
  activityId?: Id<'tripDestinationActivities'>;
  day: number;
  period: PlannerPeriod;
};

export type EditorTravelTarget =
  | { kind: 'arrival' | 'departure'; fromId?: never }
  | { kind: 'destination' | 'activity'; fromId: string };

export type EditorDetailSelection =
  | { kind: 'route'; day: number; destinationId: import('@/types/trips').Destination['id'] }
  | {
      kind: 'stay';
      day: number;
      destinationId: import('@/types/trips').Destination['id'];
      stayId?: import('@/types/trips').Stay['id'];
      entryKey?: string;
    }
  | { kind: 'travel'; day: number; target: EditorTravelTarget; entryKey?: string }
  | { kind: 'travel-choices'; day: number };

export type EditorTravelLeg = {
  fromLabel: string;
  toLabel: string;
  transfer: import('@/types/trips').TransferView | null;
  kind: 'activity' | 'destination';
  minimumDay: number;
  maximumDay: number;
  save: (input: import('@/types/trips').TripTransferInput) => Promise<boolean>;
  remove: () => Promise<boolean>;
};

export type EditorDayCardProps = {
  day: import('@/types/trip-planner').PlannerDay;
  props: ItineraryEditorProps;
  selection: EditorActivitySelection | null;
  detail: EditorDetailSelection | null;
  uploading: boolean;
  setSelection: import('react').Dispatch<
    import('react').SetStateAction<EditorActivitySelection | null>
  >;
  setDetail: import('react').Dispatch<import('react').SetStateAction<EditorDetailSelection | null>>;
  setUploading: import('react').Dispatch<import('react').SetStateAction<boolean>>;
  onAdd: (kind: 'activity' | 'stay' | 'travel' | 'destination', day: number) => void;
  onEdit: (entry: import('@/types/trip-planner').PlannerEntry, day: number) => void;
  onAddDestination: () => void;
};
