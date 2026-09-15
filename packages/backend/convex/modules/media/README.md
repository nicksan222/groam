# Media

Uploaded files are one domain. Outside this folder, import:

```ts
import { Attachments } from '#convex/modules/media/attachments/index';
import { Files } from '#convex/modules/media/files/index';
import { Media } from '#convex/modules/media/library/index';
```

| Module | Responsibility |
| --- | --- |
| `Files` | Bytes, signatures, and upload rules |
| `Media` | Organization library: store, list, delete, group logo |
| `Attachments` | Pin library media onto trip targets |

`library/commit.ts` finalizes an upload after `Files.inspect`. Public adapters stay under
`routes/media` and `routes/trips/attachments`.

## Add a file kind

Add a row to `FILE_KINDS` in `files/index.ts` (`category` plus a magic-byte
`matches` function). `Files` picks it up. No switches outside this folder.

## Attachments

Attachable trip resources are `TripTargetKind` classes. `Attachments.forTrip`
scans every kind that publishes an `attachments` policy. Domain models still
pass their own tighter per-target maximums into `Attachments.setTarget`.
