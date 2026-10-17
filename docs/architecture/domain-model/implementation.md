# Domain and ownership implementation

This file describes how the ownership rules in [README.md](./README.md) are
implemented in the Convex backend: which module owns each table, how the
itinerary graph stays coherent, and how targets and media are resolved. The
pseudocode is simplified from the source; when they disagree, the source wins.

## Table ownership map

Each domain module exports a schema fragment that `schema.ts` spreads into one
`defineSchema` call. Organization membership lives in the Better Auth
component (`components.betterAuth`), not in this schema; every row below is
scoped by an `organizationId` string or by a `tripId` whose trip carries one.

| Table | Owning module | Scope key |
| --- | --- | --- |
| `trips` | `travel/trips` | `organizationId`; `proposal.sourceTripId` on copies |
| `tripDestinations` | `travel/destinations` | `tripId` + `position` |
| `tripDestinationActivities` | `travel/activities` | `destinationId` + `position` |
| `tripDestinationStays` | `travel/stays` | `destinationId` + `position` |
| `tripBoundaryTransfers` | `travel/transfers` | `tripId` + `boundary` |
| `tripDestinationTransfers` | `travel/transfers` | `tripId` + destination endpoints |
| `tripActivityTransfers` | `travel/transfers` | `destinationId` + activity endpoints |
| `tripPackingItems` | `travel/packing` | `tripId` + `sortOrder` |
| `tripTravelers` | `travel/travelers` | `tripId` + `userId` |
| `tripPreferences` | `travel/preferences` | `organizationId` + `userId` |
| `tripIssues`, `tripIssueConditions`, `tripIssueComments` | `travel/issues` | `tripId` |
| `tripAuditEvents` | `travel/audit` | `tripId` |
| `tripProposals`, `tripProposal*`, `tripReviewSettings` | `travel/versions` | `organizationId`, `proposalId` |
| `media` | `media/library` | `organizationId` |
| `attachments`, `attachmentReferences` | `media/library` schema, `media/attachments` | `tripId` |
| `discussionMessageMedia` | `discussions/threads` | `messageId` + `mediaId` |
| `organizationInvitationCodes` | `organizations/invitations` | `organizationId` |

Every trip read goes through one visibility rule, and the trip builders bind
`trip`, `workspace` and `role` onto `ctx` before a handler runs.

```ts
async function findVisibleTrip(ctx, tripId, workspace) {
  const data = await ctx.db.get('trips', tripId);
  return data && data.organizationId === workspace.organizationId ? data : null;
}
async function loadTripContext(ctx, tripId, workspace?) {
  const data = await findVisibleTrip(ctx, tripId, resolved);
  if (!data) throw new ConvexError('Trip not found');
  return attachTrip(ctx, data, resolved, roleFor(data, userId, organizationRole)); // 'organizer' | 'participant'
}
const sharedTripId = (trip) => trip.proposal?.sourceTripId ?? trip._id; // used by sharedTripMutation
```

Source: [trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L78),
[trips/visibility.ts](../../../packages/backend/convex/modules/travel/trips/visibility.ts),
[trips/access.ts](../../../packages/backend/convex/modules/travel/trips/access.ts),
[schema.ts](../../../packages/backend/convex/schema.ts).

## Planning writes and mutability

Planning writes are gated by `assertMutable`. A shared trip cannot be edited
directly (only the local seeder bypasses this through `withSeedWrites`); a
working copy is editable only by its idea author while the idea is open. All
trip-row writes go through `patchTrip`, which keeps `updatedAt` monotonic,
invalidates review (see the
[change lifecycle implementation](../change-lifecycle/implementation.md#edit-rules-and-review-invalidation))
and re-checks issue conditions when a condition-relevant field changes.

```ts
function assertMutable(ctx) {
  if (ctx.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (ctx.trip.proposal) {
    if (author !== caller) throw new ConvexError('Only the idea author can edit this idea trip');
    if (status === 'merged' || status === 'closed') throw new ConvexError('Closed ideas are read-only');
    return;
  }
  assertPlanner(ctx);           // 'You do not have permission to edit this trip'
  if (seedWriteDepth > 0) return;
  throw new ConvexError('Start an idea to change this trip');
}
async function patchTrip(ctx, value) {
  await ctx.db.patch('trips', id, { ...value, updatedAt: Math.max(value.updatedAt, ctx.trip.updatedAt + 1) });
  await invalidateIdeaReviewAfterEdit(ctx);
  if (affectsConditions(value)) await syncTripConditions(ctx); // budget, destination, duration, startDate
}
```

Source: [trips/access.ts](../../../packages/backend/convex/modules/travel/trips/access.ts#L39),
[trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L181),
[issues/sync.ts](../../../packages/backend/convex/modules/travel/issues/sync.ts#L23).

## Itinerary graph and ordering

Destinations are ordered by a dense `position` per trip; activities and stays
by a dense `position` per destination. Limits are enforced on every read with
`take(MAX + 1)`. The trip's `destination` field summarizes the first stop and
is rewritten whenever that stop changes. Destination day ranges must be
chronological, and activity and stay days must fit inside their destination.

```ts
TripDestination.MAX_PER_TRIP = 20; ItineraryActivity.MAX_PER_TRIP = 200; ItineraryActivity.MAX_PER_DESTINATION = 30;
TripStay.MAX_PER_TRIP = MAX_STAYS_PER_TRIP /* 100 */; TripStay.MAX_PER_DESTINATION = 20;

TripDestination.add: reject same placeId ('That destination is already on this trip');
  assertChronological; drop the 'departure' boundary when a stop is appended;
  insert at position = destinations.length; first stop => patchTrip({ destination: summary })
destination.move: swap positions, keep the day gap (swappedSchedule), shift activity, stay and
  activity-transfer days; deleteInvalidDestinationConnections; deleteBoundaries(changedRouteBoundaries)
destination.delete: drop 'arrival' / 'departure' if first / last; delete transfers, stays, activities
  (deleteOwned), pins, discussion links, TripLocations; compact positions;
  patchTrip({ destination: remaining[0] ?? { status: 'undecided' } })
ItineraryActivity.reorderByDay: sort by (schedule.day, position), rewrite positions,
  then TripTransfer.deleteInvalidActivityConnections(ctx, destinationId, orderedIds)
```

Source: [destinations/index.ts](../../../packages/backend/convex/modules/travel/destinations/index.ts#L86),
[activities/index.ts](../../../packages/backend/convex/modules/travel/activities/index.ts#L120),
[stays/index.ts](../../../packages/backend/convex/modules/travel/stays/index.ts).

## Transfers and endpoint coherence

Boundary transfers (`arrival`, `departure`) attach to the first and last stop;
destination transfers connect consecutive stops; activity transfers connect
consecutive activities at one stop. Endpoints are row ids, so every reorder or
removal deletes transfers whose pair is no longer adjacent, and every schedule
change re-validates connected timings. Deleting a transfer also removes its pins.

```ts
MAX_DESTINATION_TRANSFERS = 19; MAX_ACTIVITY_TRANSFERS = 199; // boundary rows: 'Trips support two boundary transfers'
setDestination: to.position !== from.position + 1 => 'Destination transfers must connect consecutive stops'
setActivity: different destination or not adjacent
  => 'Activity transfers must connect consecutive activities at one stop'
  assertActivityOrder => 'Activity transfers must follow chronological activity order'
setBoundary: no stop => 'Add a destination before planning boundary travel'
deleteInvalidDestinationConnections(ctx, tripId, orderedIds):
  valid = { `${orderedIds[i]}:${orderedIds[i + 1]}` }; delete others via Attachments.removeTarget
assertDestinationScheduleChange / assertActivityScheduleChange:
  '<label> timing must fit between its connected itinerary elements'
```

Source: [transfers/index.ts](../../../packages/backend/convex/modules/travel/transfers/index.ts#L438),
[transfers/schema.ts](../../../packages/backend/convex/modules/travel/transfers/schema.ts).

## Trip-scoped adjuncts

Packing items are written through `assertMutable`, so they change only inside
an idea and are versioned. Traveler participation changes directly on the
shared trip: the RSVP route is a `sharedTripMutation`, so a call made from a
working copy writes to its source, then re-checks issue conditions and poll
eligibility. Favourites (`tripPreferences`) are per user and refuse copies.

```ts
export const run = sharedTripMutation({ handler: (ctx, { status, userId }) =>
  TripTravelers.setStatus(ctx, userId ?? ctx.workspace.userId, status) });
setTravelerStatus: archived => 'Archived trips are read-only';
  'invited' => 'RSVP with going, maybe, or not going'; other user and not admin => 'You can only update your own RSVP'
  upsert by_tripId_and_userId; syncTripConditions(ctx); PollSignals.scheduleTripTravelers(...)
addPackingItem: assertMutable(ctx); MAX_PACKING_ITEMS = 200
TripPreferences.setFavorite: trip.proposal => 'Idea trips cannot be favourited'
```

Source: [travelers/index.ts](../../../packages/backend/convex/modules/travel/travelers/index.ts#L59),
[routes/trips/travelers/set.ts](../../../packages/backend/convex/routes/trips/travelers/set.ts),
[packing/index.ts](../../../packages/backend/convex/modules/travel/packing/index.ts),
[preferences/index.ts](../../../packages/backend/convex/modules/travel/preferences/index.ts).

## Typed targets resolver

A target is `{ type, id }`. Each kind is a `TripTargetKind` subclass registered
once with `TripTargetKind.subscribe`; its flags (`attachments`,
`collaborative`, `costBearing`, `contextTag`) decide which behaviours it
supports. Callers use `TripTargets`, which normalizes the id against the kind's
table and proves the row belongs to the trip, and the trip to the
organization, before exposing or changing it.

```ts
// kinds: activity, activity_transfer, attachment, boundary_transfer, destination, destination_transfer, stay, trip
async function targetBelongsToTrip(ctx, tripId, target) {
  const kind = TripTargetKind.of(target.type);
  if (!kind) return false;
  if (kind.table === 'trips') return target.id === tripId;
  const id = ctx.db.normalizeId(kind.table, target.id);
  return id ? tripIdOf(await ctx.db.get(kind.table, id)) === tripId : false;
}
TripTargets.assertBelongsToTrip(ctx, trip, target)   // else 'Trip target not found'
TripTargets.setCost(...)                             // only TripTargetKind.isCostBearing kinds
TripTargets.resolveContextTag(ctx, organizationId, ref) // requireOrganizationTrip: 'Tagged trip not found'
```

Short references (`shortId`, six letters) come from `insertWithShortId` and are
looked up by `recordByReference`, which only returns a row; callers still
apply the organization check.

Source: [targets/index.ts](../../../packages/backend/convex/modules/travel/targets/index.ts#L62),
[targets/kind.ts](../../../packages/backend/convex/modules/travel/targets/kind.ts),
[targets/kinds/index.ts](../../../packages/backend/convex/modules/travel/targets/kinds/index.ts),
[references/index.ts](../../../packages/backend/convex/modules/references/index.ts).

## Media library, attachments and pins

`media` rows own an organization upload's storage id and metadata.
`attachments` holds one row per (trip, media) pair, and `attachmentReferences`
are its ordered pins onto targets. `Attachments.setTarget` replaces a target's
pin list (a no-op when ids and order match) and deletes attachments that lost
their last pin. Removing a pin never deletes the media; deleting media is
refused while it is still in use.

```ts
Attachments.setTarget: > maximum => `${label} support up to ${maximum} attachments`;
  duplicates => `${singular} attachments must be unique`;
  missing or other-organization media => `${singular} attachment not found`;
  delete old references, deleteOrphan(attachmentId), insert references with position = index
Media.delete():
  purpose === 'groupLogo'                  => 'Remove or replace the group logo before deleting this media'
  Attachments.mediaIsAttached(ctx, id)     => 'Remove this file from its trip before deleting it'
  Discussions.mediaIsAttached(ctx, id)     => 'Remove this file from its chat before deleting it'
  ctx.storage.delete(storageId); ctx.db.delete('media', id)
Attachments.mediaIsAttached: ignores pins on merged or closed idea working copies
```

Source: [media/attachments/index.ts](../../../packages/backend/convex/modules/media/attachments/index.ts#L188),
[media/library/index.ts](../../../packages/backend/convex/modules/media/library/index.ts#L146),
[media/library/schema.ts](../../../packages/backend/convex/modules/media/library/schema.ts).

## Trip covers

Trip covers are not library media. `trips.cover` holds a `pending`, `failed`
or `ready` state with a `generation` counter and an asset of source `stock` or
`upload`; one storage id cannot be both a library file and a cover. Working
copies share cover storage with their source, so replacing a cover deletes the
old file only when no trip, destination, media row or saved idea snapshot of
the same shared trip still references it.

```ts
Media.save: storage used by a trip cover => 'The uploaded file is already used as a trip cover'
TripCover.deleteIfUnreferenced(ctx, tripId, storageId):
  if (!storageId || isReferenced(storageId)) return;   // trips, tripDestinations, media
  proposals of sourceTripId, take(MAX_SNAPSHOT_PROPOSALS = 200); cap hit => keep the file
  per proposal, snapshots take(MAX_SNAPSHOTS_PER_PROPOSAL = 20); cap hit or value.includes(storageId) => keep
  TripCover.deleteStorage(ctx, storageId)
```

Source: [covers/index.ts](../../../packages/backend/convex/modules/travel/covers/index.ts#L206),
[covers/schema.ts](../../../packages/backend/convex/modules/travel/covers/schema.ts).

## What is and is not versioned

A version snapshot is a sorted set of JSON files built by
`VersionSnapshots.create`. Each file is keyed by the row's `sourceId ?? _id`,
so equivalent rows in a working copy and its source share a key, and
relationships are stored as keys (`destinationKey`, `fromActivityKey`), never
as raw ids. Each table declares its versioned fields with `VersionedModel.define`.

```ts
'trip.json'                        // TripVersionModel: attachments, budget, cover, currency,
                                   //   dateNotes, destination, duration, name, startDate
'destinations/<key>.json'          // TripDestinationVersionModel (no destination cover)
'activities/<key>.json', 'stays/<key>.json', 'packing/<key>.json'
'transfers/boundary-<arrival|departure>.json', 'transfers/destination-<key>.json', 'transfers/activity-<key>.json'
// not versioned: tripTravelers, tripPreferences, tripIssues*, discussions, polls,
//   tripAuditEvents, archive, destination covers, TripLocations (derived geospatial index)
```

Source: [versions/snapshot/index.ts](../../../packages/backend/convex/modules/travel/versions/snapshot/index.ts#L46),
[versions/fields/index.ts](../../../packages/backend/convex/modules/travel/versions/fields/index.ts),
[versions/clone.ts](../../../packages/backend/convex/modules/travel/versions/clone.ts).

## Invariants and tests

- Trips, media and targets are invisible across organizations and trips:
  [ctx.test.ts](../../../packages/backend/convex/modules/travel/trips/ctx.test.ts),
  [targets.test.ts](../../../packages/backend/convex/modules/travel/targets/targets.test.ts),
  [media.authz.test.ts](../../../packages/backend/convex/modules/media/library/media.authz.test.ts).
- A shared trip needs an idea before anyone can change it:
  [access.test.ts](../../../packages/backend/convex/modules/travel/trips/access.test.ts).
- Every target kind is registered once and exposes its flags:
  [kinds.test.ts](../../../packages/backend/convex/modules/travel/targets/kinds.test.ts).
- Moving and removing stops keeps positions dense and schedules shifted:
  [move.test.ts](../../../packages/backend/convex/modules/travel/destinations/move.test.ts),
  [remove.test.ts](../../../packages/backend/convex/modules/travel/destinations/remove.test.ts).
- Transfers connect only adjacent endpoints and cascade with their pins:
  [transfers.test.ts](../../../packages/backend/convex/modules/travel/transfers/transfers.test.ts),
  [delete.test.ts](../../../packages/backend/convex/modules/travel/transfers/delete.test.ts),
  [reorder.test.ts](../../../packages/backend/convex/modules/travel/activities/reorder.test.ts).
- RSVPs write to the shared trip, even from an idea copy:
  [travelers.test.ts](../../../packages/backend/convex/modules/travel/travelers/travelers.test.ts).
- Pinned media cannot be deleted unless pinned only on a closed idea:
  [attachments.test.ts](../../../packages/backend/convex/modules/media/attachments/attachments.test.ts).
- Library files and covers use distinct storage; a replaced cover an idea
  still shares is kept:
  [set.test.ts](../../../packages/backend/convex/modules/travel/covers/set.test.ts).

## Extending

For a new itinerary resource, follow
[add-backend-module](../../../.claude/skills/add-backend-module/SKILL.md): add
a schema fragment with `tripId` and `sourceId`, spread it into `schema.ts`, and
route every write through `assertMutable` and `patchTrip`. To version it,
declare a `VersionedModel.define` model beside the schema and update
`snapshot/index.ts`, `snapshot/format.ts`, `clone.ts` and `apply.ts`. To make
it addressable, add a target kind as described in
[targets/README.md](../../../packages/backend/convex/modules/travel/targets/README.md)
and extend the unions in `targets/schema.ts`. Test it with
[add-convex-test](../../../.claude/skills/add-convex-test/SKILL.md).
