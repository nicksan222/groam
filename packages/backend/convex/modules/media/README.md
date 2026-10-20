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
| `MediaAccess` | Bounded origin checks before URL issuance or reuse |
| `Attachments` | Pin library media onto trip targets |

`library/commit.ts` finalizes an upload after `Files.inspect`. Public adapters stay under
`routes/media` and `routes/trips/attachments`.

Uploads support images, video, and PDFs. Audio cannot be uploaded or newly pinned
to chats or trip targets. Legacy audio records remain available as file attachments;
no schema migration or deletion of old uploads is needed.

## Add a file kind

Add a row to `FILE_KINDS` in `files/index.ts` (`category` plus a magic-byte
`matches` function). `Files` picks it up. No switches outside this folder.

## Attachments

Attachable trip resources are `TripTargetKind` classes. `Attachments.forTrip`
scans every kind that publishes an `attachments` policy. Domain models still
pass their own tighter per-target maximums into `Attachments.setTarget`.

## Reading the organization library

Use `api.routes.media.page.run({ paginationOpts: { numItems: 50, cursor: null } })`
for a complete library browser. Each request inspects at most 50 raw organization
media rows, filters inaccessible files before issuing URLs, and preserves the
pagination result's continuation metadata. A page can contain no visible files
while `isDone` is false. Offer **Load more** in that state and pass
`continueCursor` into the next request; do not treat an empty page as exhaustion
or repeatedly fetch until enough visible items appear.

`api.routes.media.list.run({ limit })` remains a compatibility reader for a
bounded recent candidate window, with a limit of 1–50. It can return fewer items,
including none, after permission filtering. It does not enumerate the entire
library. The current web controls upload files directly; there is no saved-media
library picker consuming this compatibility query.

Unattached uploads remain organization library files. A linked file requires an
accessible trip origin or prior deliberate publication to an ordinary chat or as
a group logo. Check `MediaAccess` before creating a new attachment or publication
so a guessed media ID cannot create its first accessible origin. Origin checks
inspect at most 20 trip pins and 20 message references; without a known grant,
remaining unknown origins do not authorize access.
