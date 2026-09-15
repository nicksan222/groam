# Versioned field definitions

Define traveler-facing proposal diffs beside each trip model schema with `defineVersionedModel`.
Every field must select one helper, so TypeScript rejects unlabeled or unclassified fields:

```ts
export const ExampleVersionModel = defineVersionedModel({
  attachments: versionDiff.media(v.array(v.id('media')), 'Attachments'),
  internalKey: versionDiff.hidden(v.string(), 'Internal reference'),
  name: versionDiff.text(v.string(), 'Name')
});
```

Available strategies are `hidden`, `media`, `text`, `date`, `destination`, `duration`, `money`,
`schedule`, and `travelMode`. Snapshot serialization must use `serializeVersionedModel` with that
model, which makes adding or removing snapshot fields a compile-time checked change.

No extra Convex table is needed. Diff presentation is static schema metadata; media IDs remain in
version snapshots and are resolved to authorized media projections only when a proposal is read.
