import type { DataRef, KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import type { FunctionReturnType } from 'convex/server';
import type { IssueStatus } from '@/types/issues';

export type TripBoardIdea = FunctionReturnType<typeof api.routes.trips.versions.list.run>[number];

/** A row of the trip's issue list, the shape the board's optimistic moves rewrite. */
export type TripBoardIssue = FunctionReturnType<typeof api.routes.trips.issues.list.run>[number];

/** One agreed stop or planned entry, placed on the day it starts. */
export type AgreedCard = {
  day: number;
  detail: string | null;
  key: string;
  kind: 'plan' | 'stop';
  label: string;
  title: string;
};

export type AgreedDay = { cards: AgreedCard[]; day: number };

/** Lane ids are also the `data-lane` values. The four issue lanes are the issue statuses. */
export type TripBoardLane = IssueStatus | 'agreed' | 'review';

/** What the viewer may do on this trip, copied onto every lifted card for the drop rules. */
export type TripBoardRights = { archived: boolean; canPropose: boolean };

export type TripBoardIssueItem = TripBoardRights & { issue: TripBoardIssue; kind: 'issue' };

export type TripBoardIdeaItem = TripBoardRights & { idea: TripBoardIdea; kind: 'idea' };

/** Something on the board a traveler can pick up. */
export type TripBoardDragItem = TripBoardIdeaItem | TripBoardIssueItem;

/** What a drop does. `label` is the hint shown over the lane, for example "Mark done". */
export type TripBoardMove =
  | { issue: TripBoardIssue; kind: 'moveIssue'; label: string; status: IssueStatus }
  | { issueId: Id<'tripIssues'>; kind: 'startIdea'; label: string }
  | { kind: 'applyIdea'; label: string; proposalId: Id<'tripProposals'> };

export type TripBoardDropDecision =
  | { move: TripBoardMove; outcome: 'allowed' }
  | { outcome: 'refused'; reason: string }
  | { outcome: 'unavailable' };

/** The cards directly above and below a dropped issue, in the target lane after the drop. */
export type TripBoardNeighbours = {
  afterIssueId?: Id<'tripIssues'>;
  beforeIssueId?: Id<'tripIssues'>;
};

/** Where a lifted card would land: a lane and a slot in it. */
export type TripBoardDropTarget = TripBoardNeighbours & {
  /** Slot among the lane's cards, not counting the lifted one. */
  index: number;
  lane: TripBoardLane;
  /** True when the slot is the card's own place, so nothing would change. */
  unchanged: boolean;
};

/** What a lane or card registers with dnd-kit, so collisions, drops, and announcements can read it. */
export type TripBoardDragData =
  | { item: TripBoardDragItem; type: 'card' }
  | { lane: TripBoardLane; type: 'lane' };

/** An active draggable or an over droppable: anything dnd-kit hands back that carries our data. */
export type TripBoardDndNode = { data: DataRef };

/** The card being carried and where it would land. */
export type TripBoardDragState = {
  item: TripBoardDragItem | null;
  target: TripBoardDropTarget | null;
};

/** How a card offers its assignee control: see `assignMode`. */
export type TripBoardAssignMode = 'avatar' | 'hover' | 'static';

/** The stable facts every card on the board reads, so lanes do not pass them down. */
export type TripBoardContextValue = {
  rights: TripBoardRights;
  tripId: Id<'trips'>;
  viewerUserId: string | undefined;
};

/** What dnd-kit hands a keyboard coordinate getter about the drag in progress. */
export type TripBoardKeyboardContext = Parameters<KeyboardCoordinateGetter>[1]['context'];

/** How many cards each lane holds, `undefined` while it loads; the phone lane switcher shows them. */
export type TripBoardLaneCounts = Record<TripBoardLane, number | undefined>;
