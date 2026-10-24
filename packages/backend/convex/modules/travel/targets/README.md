# Trip targets

A trip target is any trip-owned resource addressed by `{ type, id }` —
attachments, itinerary costs, assistant context tags, and collaborative comments.

Each kind is a `TripTargetKind` subclass. Construct it and
`TripTargetKind.subscribe` it in `kinds/index.ts`. Outside this folder, use
`TripTargets` (and `Attachments` for media). Do not import the kind map.

## Add a kind

1. Add `kinds/<name>/index.ts` (and `kinds/<name>/transfer.ts` when the kind has a transfer) with a class that calls `super({ type, table, ... })`.
2. `TripTargetKind.subscribe(new YourTarget())` in `kinds/index.ts`.
3. Include `targetValidator` (and `tagValidator` when `contextTag`) in the
   unions in `schema.ts` so `Infer` stays narrow.

Flags on the class decide behavior:

- `attachments` — public attach API + trip-wide scan limits
- `collaborative` — comment / discussion targeting
- `costBearing` + `costUpdatedEvent` — assistant itinerary cost updates
- `contextTag` — assistant chat tags (`tagValidator` uses `kind`, not `type`)
- `contextCatalogTake` — how many of this kind appear in the assistant context catalog per trip

Override `catalogDescription` and `contextDetails` on the subclass when the catalog
label or tagged JSON is more than the document name. Outside this folder, use
`TripTargets.normalizeContextTag`, `resolveContextTag`, `contextCatalog`, and
`contextDetails`.
