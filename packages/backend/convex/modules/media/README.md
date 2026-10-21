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

Use `api.routes.media.discover.run({ cursor: null })` for complete manual library
traversal, or pass `mediaId` to resolve one known file. The response is
`{ items, cursor, done }`. Each request visits one library candidate or at most
20 origin references. Keep **Load more** available when `items` is empty and
`done` is false; pass the returned cursor unchanged into the next request.
These opaque, workspace/user-scoped cursors are bookkeeping, not access grants.
Do not parse them or pass them to `usePaginatedQuery`, native `endCursor`, or
another endpoint. Restart traversal after changing workspace or when sharing or
payment changes should refresh previously visited results. Every returned file
and reuse proof is checked against current permissions again.

`media.page` retains genuine native pagination, requested sizes 1–50, and a
20-candidate raw page cap. It throws
`MEDIA_ACCESS_UNRESOLVED` when a file has more origins than their fast scan can
resolve; continue with `media.discover` instead of interpreting that state as a
denial. Bulk errors contain no file metadata. No current saved-library picker
consumes these queries; existing upload controls remain unchanged.

Unattached uploads remain organization library files. Linked files require an
accessible trip origin, an existing group-logo publication, or deliberate
sharing to an ordinary chat. Ordinary-chat sharing publishes the file to the
organization library independently of the chat's audience; reading the chat
itself still requires its normal authorization. There is no origin-count limit
or persisted publication marker: old origin histories resolve through the same
bounded continuation protocol, without a backfill.

Discovery returns optional `accessOrigin: { kind: 'attachment' | 'message', id }`.
Reuse routes accept this as `accessOrigin` (save/logo/remove), or as
`mediaOrigins: [{ mediaId, origin }]` (message send/trip attachment set). References
are revalidated against the exact file, organization, actual pin/receipt and
current canonical trip entitlement in the write transaction. A guessed reference
cannot create a first public grant. Legacy requests without a proof retain the
bounded fast path; unresolved histories explicitly require discovery.

Message attachments render through an actual database receipt in an authorized
conversation. Trip attachments render through their actual pin on an authorized
trip/target. These direct reads do not need to discover another origin, so an
older file remains visible on an accessible surface even when that surface was
its twenty-first or later origin. Neither caller-supplied media IDs nor cursor
phases replace those checks. Origin scans and file checks run sequentially to
bound nested I/O as well as indexed reads.
