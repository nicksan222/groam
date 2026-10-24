import type { AgentScreenContext } from '@groam/ai/ui/context/agent-context';
import type { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import type { useCurrentTrip } from '@/features/trips/hooks/use-current-trip';
import type { useTripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import type { useTripTransferForm } from '@/features/trips/hooks/use-trip-transfer-form';
import type { useTrip } from '@/features/trips/hooks/use-trips';
import type { TripCostSplit } from '@/features/trips/trip-forms/trip-cost';
import type { TripCurrency } from '@/features/trips/trip-forms/trip-currencies';
import type { tripTabSections } from '@/features/trips/trip-sections';
import type { IdeaPlanningSection } from '@/types/ideas';

export type CreateTripInput = FunctionArgs<typeof api.routes.trips.create.run>['input'];
export type TripDestinationActivityInput = FunctionArgs<
  typeof api.routes.trips.destinations.activities.add.run
>['input'];
export type TripDestinationInput = FunctionArgs<
  typeof api.routes.trips.destinations.add.run
>['input'];
export type TripStayInput = FunctionArgs<
  typeof api.routes.trips.destinations.stays.add.run
>['input'];
export type TripDestinationSchedule = Pick<
  FunctionArgs<typeof api.routes.trips.destinations.update.run>,
  'dayNotes' | 'endDay' | 'startDay'
>;
export type TripTransferInput = FunctionArgs<
  typeof api.routes.trips.destinations.transfers.set.run
>['input'];
export type TripBoundary = FunctionArgs<typeof api.routes.trips.transfers.set.run>['boundary'];
export type TransportMode = TripTransferInput['mode'];
export type TripDetail = NonNullable<FunctionReturnType<typeof api.routes.trips.find.run>> & {
  groupMemberCount: number;
};
/** One person on a trip's roster, with their RSVP. */
export type TripTraveler = FunctionReturnType<typeof api.routes.trips.travelers.list.run>[number];
/** An RSVP as the roster shows it; `invited` is going without a seat. */
export type RosterStatus = TripTraveler['status'];
/** The RSVPs a person can pick; invited only follows from having no seat. */
export type AssignableStatus = Exclude<RosterStatus, 'invited'>;
export type TripListItem = FunctionReturnType<typeof api.routes.trips.list.run>['page'][number];
export type TripUpdateInput = FunctionArgs<typeof api.routes.trips.update.run>['input'];

/** A section of a shared trip, as the sidebar lists it. */
export type TripTabSection = (typeof tripTabSections)[number];

/** What a section's page header offers as its one creation entry. */
export type TripCreateKind = 'idea' | 'issue' | 'poll' | 'research';

/** What a section's header can ask its body to do: start a thing, or (queues) open the search. */
export type TripSectionRequest = TripCreateKind | 'search' | 'sort';

/** What a section's header button can start: a thing on the trip, or an invitation to the group. */
export type SectionAction = TripCreateKind | 'invite';

/** Counts for Research, and for Ideas, Issues, and Polls, which also say whether they count what waits on the viewer; a section has none until its number loads. */
export type TabCounts = Partial<Record<'research', number>> &
  Partial<Record<'ideas' | 'issues' | 'polls', { count: number; waiting: boolean }>>;

/** The parts of a trip screen's assistant context that vary by section. */
export type TripScreenAgentPart = Pick<AgentScreenContext, 'capabilities' | 'data' | 'description'>;

/** The trip the sidebar is about: the route's trip, else the last one opened in this group. */
export type CurrentTrip = ReturnType<typeof useCurrentTrip>['trip'];

/** What the assistant is told a trip screen shows: a shared trip section, a view of an idea's working copy, or its change review. */
export type TripAgentView = TripTabSection | IdeaPlanningSection | 'idea-compare';

export type TripState = ReturnType<typeof useTrip>;
export type LoadedTrip = NonNullable<TripState['trip']>;

export type TripNavigation = {
  closeAddDestination: () => void;
  openAddDestination: () => void;
  openSection: (section: IdeaPlanningSection) => void;
};

export type Destination = TripDetail['destinations'][number];
/** One destination on the Map tab: its number in the whole route, and the day that colors it. */
export type MapStop = {
  colorDay: number | null;
  destination: Destination;
  number: number;
};
export type TripActivity = Destination['activities'][number];
export type TripStayDestination = Destination;
export type Stay = Destination['stays'][number];
export type DestinationTransfer = NonNullable<Destination['transferToNext']>;

export type MoveDestination = (
  destinationId: Id<'tripDestinations'>,
  direction: 'earlier' | 'later'
) => Promise<boolean>;

export type UpdateDestination = (
  destinationId: Id<'tripDestinations'>,
  schedule: TripDestinationSchedule
) => Promise<boolean>;

export type TripTransferActions = {
  removeActivityTransfer: (transferId: Id<'tripActivityTransfers'>) => Promise<boolean>;
  removeBoundaryTransfer: (transferId: Id<'tripBoundaryTransfers'>) => Promise<boolean>;
  removeDestinationTransfer: (transferId: Id<'tripDestinationTransfers'>) => Promise<boolean>;
  setActivityTransfer: (
    fromActivityId: Id<'tripDestinationActivities'>,
    toActivityId: Id<'tripDestinationActivities'>,
    input: TripTransferInput
  ) => Promise<boolean>;
  setBoundaryTransfer: (boundary: TripBoundary, input: TripTransferInput) => Promise<boolean>;
  setDestinationTransfer: (
    fromDestinationId: Id<'tripDestinations'>,
    toDestinationId: Id<'tripDestinations'>,
    input: TripTransferInput
  ) => Promise<boolean>;
};

export type TripStayActions = {
  addStay: (destinationId: Id<'tripDestinations'>, input: TripStayInput) => Promise<boolean>;
  removeStay: (stayId: Id<'tripDestinationStays'>) => Promise<boolean>;
  updateStay: (stayId: Id<'tripDestinationStays'>, input: TripStayInput) => Promise<boolean>;
};

export type TripActivityActions = TripTransferActions & {
  addActivity: (
    destinationId: Id<'tripDestinations'>,
    input: TripDestinationActivityInput
  ) => Promise<boolean>;
  removeActivity: (activityId: Id<'tripDestinationActivities'>) => Promise<boolean>;
  reorderActivities: (destinationId: Id<'tripDestinations'>) => Promise<boolean>;
  updateActivity: (
    activityId: Id<'tripDestinationActivities'>,
    input: TripDestinationActivityInput
  ) => Promise<boolean>;
};

export type TripDestinationWithActivities = Destination;
/** One idea as a trip's idea list reads it. */
export type TripProposal = FunctionReturnType<typeof api.routes.trips.versions.list.run>[number];
export type VersionStatus = TripProposal['status'];
export type ProposalDetail = FunctionReturnType<typeof api.routes.trips.versions.get.run>;
export type ProposalActionRunner = (
  label: string,
  action: () => Promise<boolean>
) => Promise<boolean>;
export type ProposalFeedbackItem = FunctionReturnType<
  typeof api.routes.trips.versions.feedback.list.run
>[number];
export type VisualDiffField = ProposalDetail['changes'][number]['fields'][number];

export type TransferForm = ReturnType<typeof useTripTransferForm>;

export type TripRouteSearch = {
  addDestination?: boolean;
  commentTarget?: string;
  day?: number;
};

export type TripToolbarFacts = {
  destination: string;
  length: string | null;
  window: string;
};

export type TripLocation = Pick<
  Destination,
  'countryCode' | 'latitude' | 'longitude' | 'name' | 'placeId'
> & {
  context: string;
  type: string;
};

export type DestinationScheduleSource = Pick<Destination, 'dayNotes' | 'endDay' | 'startDay'>;

export type DestinationScheduleDraft = {
  endDay: string;
  notes: string;
  startDay: string;
};

export type StayAttachmentDraft = Pick<Stay['attachments'][number], 'id' | 'name'>;

export type StaySource = Pick<
  Stay,
  | 'address'
  | 'checkInDay'
  | 'checkInTime'
  | 'checkOutDay'
  | 'checkOutTime'
  | 'costAmount'
  | 'id'
  | 'notes'
  | 'title'
> & {
  attachments: StayAttachmentDraft[];
  costSplit?: Stay['costSplit'];
};

export type StayDraft = {
  address: string;
  attachments: StayAttachmentDraft[];
  checkInDay: string;
  checkInTime: string;
  checkOutDay: string;
  checkOutTime: string;
  cost: string;
  costSplit: TripCostSplit;
  notes: string;
  title: string;
};

export type DestinationMoveClearsTravel = {
  earlier: boolean;
  later: boolean;
};

export type TimeBlock = TripDestinationActivityInput['schedule']['timeBlock'];
export type ActivityAttachmentDraft = Pick<TripActivity['attachments'][number], 'id' | 'name'>;
export type ActivityFormState = {
  address: string;
  attachments: ActivityAttachmentDraft[];
  cost: string;
  costSplit: TripCostSplit;
  dayNumber: string;
  editingId: Id<'tripDestinationActivities'> | null;
  endDayNumber: string;
  endTime: string;
  isOpen: boolean;
  notes: string;
  startTime: string;
  timeBlock: TimeBlock;
  title: string;
};

export type TripActivitySubmitState = Pick<
  ActivityFormState,
  'cost' | 'dayNumber' | 'endDayNumber' | 'endTime' | 'startTime' | 'title'
> & {
  isPending: boolean;
  isUploading: boolean;
};

export type TransferAttachmentDraft = Pick<
  DestinationTransfer['attachments'][number],
  'id' | 'name'
>;
export type TransferKind = 'activity' | 'destination';
export type InitialTransfer = Pick<
  DestinationTransfer,
  'durationMinutes' | 'mode' | 'notes' | 'timing'
> & {
  attachments: TransferAttachmentDraft[];
  costAmount?: DestinationTransfer['costAmount'];
  costSplit?: DestinationTransfer['costSplit'];
};
export type TransferFormStatus = { kind: 'error' | 'warning'; message: string } | null;
export type TransferOperation = 'idle' | 'uploading';
export type TransferDraft = {
  attachments: TransferAttachmentDraft[];
  cost: string;
  costSplit: TripCostSplit;
  duration: string;
  endDay: string;
  endTime: string;
  mode: TransportMode;
  notes: string;
  startDay: string;
  startTime: string;
  timingEnabled: boolean;
};
export type TransferFormState = {
  draft: TransferDraft;
  operation: TransferOperation;
  status: TransferFormStatus;
};
export type TransferFormAction =
  | { field: 'cost' | 'duration' | 'notes'; type: 'changeText'; value: string }
  | { split: TripCostSplit; type: 'changeSplit' }
  | {
      endDay: number;
      endTime: string;
      startDay: number;
      startTime: string;
      type: 'changeTiming';
    }
  | { mediaId: Id<'media'>; type: 'removeAttachment' }
  | { attachments: TransferAttachmentDraft[]; type: 'appendAttachments' }
  | { mode: TransportMode; type: 'changeMode' }
  | { enabled: boolean; type: 'changeTimingEnabled' }
  | { operation: TransferOperation; type: 'setOperation' }
  | { status: TransferFormStatus; type: 'setStatus' };

export type ItineraryChange = Pick<
  ProposalDetail['changes'][number],
  'change' | 'entity' | 'key' | 'label'
> & { fields: ItineraryChangeField[] };
export type ItineraryChangeKind = ItineraryChange['change'];
export type ItineraryChangeField = Pick<
  ProposalDetail['changes'][number]['fields'][number],
  'after' | 'before' | 'display' | 'format' | 'key' | 'label'
> &
  Partial<Pick<ProposalDetail['changes'][number]['fields'][number], 'mediaAfter' | 'mediaBefore'>>;
export type VersionedIdentity = {
  id: string;
  sourceId?: string | null;
};
export type ItineraryChangeFieldRow = {
  after: string;
  before: string;
  key: string;
  label: string;
};

export type TransferView = Pick<
  DestinationTransfer,
  'attachments' | 'costAmount' | 'costSplit' | 'durationMinutes' | 'mode' | 'notes' | 'timing'
>;

export type CreateTripIdeaResult = Pick<
  FunctionReturnType<typeof api.routes.trips.versions.create.run>,
  'proposalId'
> | null;

/** An activity planned on the shared trip's calendar, waiting for the idea started to hold it. */
export type PlannedCalendarActivity = {
  input: TripDestinationActivityInput;
  /** The shared trip's stop it belongs to; the idea's copy of that stop points back to it. */
  sourceDestinationId: Id<'tripDestinations'>;
};

export type CreateTripIdeaIntent = {
  addActivity?: PlannedCalendarActivity;
  addDestination: boolean;
  firstDestination?: boolean;
  claimGear?: string;
  section: 'calendar' | 'itinerary' | 'overview' | 'packing';
  titleHint?: string;
};

export type IdeaRebaseResult = FunctionReturnType<typeof api.routes.trips.versions.rebase.run>;
export type IdeaRebaseConflict = Extract<
  IdeaRebaseResult,
  { kind: 'needs_choices' }
>['conflicts'][number];
export type IdeaRebaseResolution = FunctionArgs<
  typeof api.routes.trips.versions.rebase.run
>['resolutions'][number];
export type IdeaRebaseChoice = IdeaRebaseResolution['choice'];

export type ActivityType = TripDetail['activity'][number]['type'];
export type TripActivityItem = TripDetail['activity'][number];
export type TripActivityFilters = {
  activityType: ActivityType | 'all-activity-types';
  query: string;
  userId: string;
};

export type ScheduledDestination = Pick<Destination, 'endDay' | 'startDay'> & {
  id: string;
};

export type ActivityDays = Pick<TripActivity, 'dayNumber' | 'endDayNumber'>;

export type ActivityOrderIssue = 'out_of_order' | 'overlap';

export type TripInformationFormState = {
  budget: string;
  currency: TripCurrency;
  dateNotes: string;
  destination: TripLocation | null;
  destinationStatus: 'known' | 'undecided';
  name: string;
  startDate: string;
  totalDuration: string;
};

export type InformationSetter = <Field extends keyof TripInformationFormState>(
  field: Field,
  value: TripInformationFormState[Field]
) => void;

export type DetailsResolveChoice = 'mine' | 'shared';

export type TripItineraryState = Pick<
  TripState,
  | 'addActivity'
  | 'addDestination'
  | 'addStay'
  | 'moveDestination'
  | 'removeActivity'
  | 'removeActivityTransfer'
  | 'removeBoundaryTransfer'
  | 'removeDestination'
  | 'removeDestinationTransfer'
  | 'removeStay'
  | 'reorderActivities'
  | 'setActivityTransfer'
  | 'setBoundaryTransfer'
  | 'setDestinationTransfer'
  | 'update'
  | 'updateActivity'
  | 'updateDestination'
  | 'updateStay'
>;

export type TripStatusFilter = 'active' | 'all' | 'archived';

export type TripListFilters = {
  query: string;
  status: TripStatusFilter;
};

export type TripDurationInput = NonNullable<TripUpdateInput['duration']>;
export type TripDurationSource = Pick<TripDetail, 'idealDurationDays' | 'minimumDurationDays'>;

export type TripActivityEditor = ReturnType<typeof useTripActivityEditor>;
