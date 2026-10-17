# Conversation kinds and trip research

Date: 2026-10-17
Status: draft for review

## Intent

Travelers want a place per trip and subject to dump what they found: links,
thoughts, photos, for example "Museums in Lisbon". Anyone on the trip can post.
Agents post into the same stream and their output looks like any other message.
A research links to the issues, ideas, and itinerary items it informs.

The feature should not be a workaround. Researches, group chats, and (later)
personal AI chats are all conversations. They differ only in who can see them,
where they live, and when agents reply. This spec makes that difference an
explicit `kind` with a policy registry.

Pre-production: the schema changes in place. There is no data migration and
local data is reset.

### Agreed decisions

- A research is a `kind` of discussion. It reuses messages, media, reactions,
  edit/delete, and in-thread agent replies.
- Everyone who can see the trip can read and post. Only the creator or a trip
  organizer renames it, edits the brief, or deletes it.
- A research can link to issues, ideas, and itinerary items (destination,
  activity, stay). Links are many-to-many.
- Agent abilities in v1: summarize a research, research a subject on request
  (web search, posting findings as messages), and the Groam chat assistant can
  read, create, post to, and link researches.
- Personal AI chats become `kind: 'assistant'` in phase 2.

## Phases

- **Phase 1 (this plan):** kind model and policy registry, the `group` and
  `research` kinds, `discussionLinks`, research UI, the researcher agent, and
  the Groam research tools. The `assistant` variant exists in the schema union,
  but nothing creates it yet.
- **Phase 2 (separate plan):** move personal AI chats from Agent thread
  summaries onto `kind: 'assistant'`. See the end of this spec.

## 1. Data model

### Kind policy registry

New file `packages/backend/convex/modules/discussions/kinds/index.ts`. It is
plain data, so every kind-dependent decision reads the policy:

```ts
export type ConversationKind = 'group' | 'assistant' | 'research';

type KindPolicy = {
  /** Who may read and post. */
  audience: 'members' | 'owner' | 'trip';
  /** Whether the row carries a trip. */
  trip: 'optional' | 'none' | 'required';
  /** When an agent replies to a human message. */
  agentTrigger: 'mention' | 'always';
  /** Where the conversation is listed in the web app. */
  home: 'chats' | 'assistant' | 'trip';
  /** Whether discussionLinks may point from this conversation. */
  links: boolean;
};

export const conversationKinds = {
  group: { audience: 'members', trip: 'optional', agentTrigger: 'mention', home: 'chats', links: false },
  assistant: { audience: 'owner', trip: 'none', agentTrigger: 'always', home: 'assistant', links: false },
  research: { audience: 'trip', trip: 'required', agentTrigger: 'mention', home: 'trip', links: true }
} as const satisfies Record<ConversationKind, KindPolicy>;

export function kindPolicy(kind: ConversationKind): KindPolicy;
```

No code outside `modules/discussions/kinds` compares `kind` to a literal in
order to decide access, listing, or agent triggering. Rendering a kind-specific
header in the web app may branch on `kind`.

### `discussions` table

The table becomes a discriminated union. The schema enforces each kind's
invariants:

```ts
const base = {
  clientRequestId: v.string(),
  createdBy: author,
  lastMessage: v.optional(lastMessage),
  organizationId: v.string(),
  shortId: v.string(),
  threadId: v.optional(v.string()),
  title: v.string(),
  updatedAt: v.number()
};

discussions: defineTable(
  v.union(
    v.object({ ...base, kind: v.literal('group'), members: v.array(discussionMember), tripId: v.optional(v.id('trips')) }),
    v.object({ ...base, kind: v.literal('assistant') }), // phase 2 adds its fields
    v.object({ ...base, kind: v.literal('research'), tripId: v.id('trips'), brief: v.optional(v.string()) })
  )
)
  // existing indexes kept
  .index('by_organizationId_and_kind_and_updatedAt', ['organizationId', 'kind', 'updatedAt'])
  .index('by_tripId_and_kind_and_updatedAt', ['tripId', 'kind', 'updatedAt'])
```

The denormalized `members` array belongs to `group` only, because the people in
a research are whoever takes part.

`title` is the research subject (required, 1 to 120 characters). `brief` is
optional (up to 2000 characters).

### `discussionMembers` as participation

`discussionMembers` keeps its shape. Its meaning widens from "access grant" to
"participation":

- `members` audience: a row grants access (current behavior).
- `trip` audience: a row grants nothing. It is upserted on first open
  (`markRead`) or first post, so `lastReadAt` and the participant roster work
  for researches.
- `owner` audience: one row for the owner (phase 2).

### `discussionLinks` table

New, in `modules/discussions/links/schema.ts`:

```ts
const linkTarget = v.union(
  v.object({ kind: v.literal('issue'), issueId: v.id('tripIssues') }),
  v.object({ kind: v.literal('idea'), proposalId: v.id('tripProposals') }),
  v.object({ kind: v.literal('tripTarget'), target: tripTargetValidator }) // destination | activity | stay only
);

discussionLinks: defineTable({
  createdBy: author,
  discussionId: v.id('discussions'),
  organizationId: v.string(),
  target: linkTarget,
  targetKey: v.string(), // "issue:<id>" | "idea:<id>" | "destination:<id>" ...; reverse lookup and dedupe
  tripId: v.id('trips')
})
  .index('by_discussionId', ['discussionId'])
  .index('by_targetKey', ['targetKey'])
  .index('by_discussionId_and_targetKey', ['discussionId', 'targetKey'])
  .index('by_tripId', ['tripId'])
```

Rules:

- Links are allowed only when `kindPolicy(discussion.kind).links` is true.
- The target must belong to the same trip as the research. Ideas match through
  `sourceTripId`.
- The same discussion and target pair is stored once (idempotent link).
- Anyone who can see the research can link or unlink.
- Cascades: deleting a research deletes its links. Deleting an issue, idea, or
  trip target deletes links whose `targetKey` matches. Deleting a trip deletes
  its research discussions and their links.

## 2. Access and the send path

### `DiscussionAccess`

`DiscussionAccess.forWorkspace` checks the org, then switches on
`kindPolicy(kind).audience`:

- `members`: a `discussionMembers` row for this user (unchanged).
- `owner`: `discussion.createdBy.userId === workspace.userId`.
- `trip`: the trip exists and `trip.organizationId === workspace.organizationId`.
  This shares a helper with `loadTripContext` instead of copying it.

Any failure throws `Discussion not found`, as today. `DiscussionAccess` gains
`canManage`: for the `members` audience it keeps today's rename rule unchanged;
otherwise it is true for the creator and for trip organizers (`roleFor`) when
the audience is `trip`. Rename, brief edit, and delete require `canManage`.

Writes to a research on an archived trip are refused (`assertMutable`
semantics). Reading still works.

### Thread access

`modules/assistant/model/thread/access.ts` stops classifying threads by
`thread.userId`. It resolves the thread through `discussions.by_threadId`.
When a row exists, scope comes from the kind (`assistant` is `private`,
everything else is `discussion`) and access goes through `DiscussionAccess`.
Private chats that are not migrated yet (phase 1) keep the current `userId`
path as a fallback. Phase 2 removes that fallback.

### Agent trigger

`Discussions.send` selects the agent from the policy:

- `mention`: the explicit `requestedAssistantAgent`, otherwise
  `mentionedAssistantAgent(text)` (unchanged).
- `always`: the kind's default agent (`groam`). Used in phase 2.

The rest of the pipeline is unchanged (`saveMessage`, the `discussionMessages`
row, `queueDiscussionTurn`, the client calling `respond`). Agent replies already
render inline as messages.

### Listing

- `Discussions.list` (Chats sidebar) lists only `home: 'chats'` kinds, through
  `by_organizationId_and_kind_and_updatedAt`. Unread logic is unchanged.
- New `Discussions.listForTrip(tripId, kind)` lists researches through
  `by_tripId_and_kind_and_updatedAt`. It returns title, brief, lastMessage,
  participant count, link count, unread, and updatedAt.
- References: `research` short ids resolve through the existing `discussions`
  entry in `referenceTable`. The resolver returns the kind so the web app can
  route to the trip research page instead of `/chat`.

## 3. Researcher agent

A new chat agent in `packages/ai/src/agents/researcher/definition.ts`:

```ts
export const researcherAgent = defineChatAgent({
  capabilities: capabilitiesForAgent('researcher'),
  description: 'Researches a trip subject on the web and summarizes what the group has collected.',
  id: 'researcher',
  identity: 'You are Groam’s trip researcher.',
  label: 'Researcher',
  policies: [
    'Post findings as short entries: a link, one line on why it matters, and price, hours, or caveats when known.',
    'When asked to summarize, cover every link and note in the conversation: key options, trade-offs, open questions. Cite who posted what.',
    'Stay on the research subject and brief. Do not change the itinerary.'
  ]
});
```

- Capabilities: `web.search`, `research.read`, `research.link`. It has no
  itinerary write tools.
- Users invoke it with `@researcher` in any conversation whose kind uses the
  `mention` trigger. The research composer's agent chip defaults to suggesting
  it.
- **Summarize** is a header button on research pages. It sends a normal message
  "Summarize this research" with `requestedAssistantAgent: 'researcher'`. The
  prompt and the reply both appear in the stream for everyone.
- **Research for me**: users ask in the stream, for example "@researcher find
  kid-friendly museums under €20". The reply is the findings.
- Discussion instructions (`packages/ai/src/backend/instructions`) add the
  research subject, brief, and links to the system context when the
  conversation is a research.

## 4. Groam assistant tools

New capability specs, bound through `defineCapability` (add-agent-capability
skill), implemented in `packages/backend/assistant/tools/research/*`:

| Capability | Agents | Effect |
| --- | --- | --- |
| `research.list` | groam, researcher | Researches of a trip: id, title, brief, last activity |
| `research.read` | groam, researcher | One research: brief, links, recent messages (paged, capped) |
| `research.create` | groam | Create a research on a trip (title, optional brief) |
| `research.post` | groam | Post a message into a research as the calling agent |
| `research.link` | groam, researcher | Link or unlink a research to an issue, idea, or trip target |

`research.post` saves an assistant message into the research's Agent thread,
attributed to the agent, and bumps `lastMessage` and `updatedAt`. It is the
same message shape that in-thread replies already use, so it renders the same.
Every tool runs as the calling user and goes through `DiscussionAccess`.

Screen context (`useSetAgentContext`) on research pages exposes the research
id, title, brief, and links, so "add this to my museums research" resolves.

## 5. Web app

### Routes

- `apps/web/src/routes/_workspace.trips.$tripId.research.$researchId.tsx` is a
  thin route that composes `ResearchThreadView`. The id resolves through
  `useResolvedParams` (short ids).
- The trip section list gains `research` (label "Research"), placed after
  `ideas` in `tripTabSections`. `active-trip-section.tsx` renders
  `ResearchListView` for it, and `trip-section-nav.tsx` shows the count.

### Feature folder `apps/web/src/features/research`

- `research-list/research-list-view.tsx`: cards with title, brief excerpt,
  last message, participant avatars, link chips, and an unread dot. Empty
  state: "Start a research: dump links and notes about one subject".
- `research-create/create-research-dialog.tsx`: subject (required) and brief.
  Opened from the list, or from an issue or idea with that link pre-filled.
- `research-thread/research-thread-view.tsx`: reuses the discussion thread
  pieces (`ThreadMessage`, `DiscussionThreadComposer`, reactions, attachments)
  with a research header.
- `research-thread/research-header.tsx`: subject, brief (editable when
  `canManage`), Summarize button, and link chips with add and remove.
- `research-links/link-target-picker.tsx`: searchable picker over the trip's
  issues, ideas, destinations, activities, and stays.
- `hooks/use-trip-researches.ts`, `hooks/use-research.ts`,
  `hooks/use-research-links.ts`.

To reuse the thread view, `DiscussionThreadView` is split so that the message
list and composer become a `DiscussionThreadBody` with no header and no
route-specific code. The chat page and the research page each wrap it with
their own header.

### Reverse links

- Issue detail sidebar (`issue-sidebar.tsx`): a "Research" section that lists
  linked researches, with "Link research" (picker over the trip's researches)
  and "New research" (create dialog pre-linked).
- Idea detail: the same section.
- Itinerary items: links are created and shown from the research side in v1.
  The itinerary has no item detail surface to host a reverse list, so that is
  out of scope.

### Chats sidebar

It shows only `group` conversations (backend filter). Command palette results
route research references to the trip research page.

## 6. Error handling

- Every access failure shows as `Discussion not found`. The web app shows the
  standard not-found state on the research route.
- Invalid link targets (wrong trip, deleted target, kind without links) throw a
  `ConvexError` with a user-readable message, shown as a toast.
- Writes on archived trips throw "This trip is archived". The composer is
  disabled with that hint.
- Agent failures use the existing `assistantStatus: 'failed'` rendering and
  retry.
- Rate limits reuse the existing discussion send limits and
  `tripAssistantMessage`.

## 7. Testing

Backend (convex-test, `#testing` factory, real routes):

- Access per audience: a trip member who is not a participant can read and post
  in a research. Another org gets not-found. A `group` discussion still needs
  membership.
- `canManage`: a participant cannot rename or delete a research. The creator
  and a trip organizer can.
- First post or open creates a participation row. Unread works for researches.
- Links: same-trip check, idempotence, refusal on a kind without links, reverse
  lookup by target, and cascades on deleting an issue, an idea, a trip target,
  a research, and a trip.
- Listing: the Chats list excludes researches. `listForTrip` returns only that
  trip's researches.
- Send: `@researcher` in a research queues a researcher turn.
- Tools: `research.post` appears in the research message list, attributed to
  the agent. `research.*` refuse other-org ids.
- Archived trip: writes refused.

Web (Vite+ browser mode views, mocked hooks): research list (loading, empty,
populated), create dialog validation, research header (Summarize sends the
expected request, link chips, brief edit visible only with `canManage`), and the
issue sidebar research section.

Journey (`apps/web/e2e`): create a research from an issue, post a link as two
different travelers, and see it linked back on the issue.

Seeder: demo scenarios add two researches with messages from several travelers
and links to an issue and a destination.

## Phase 2 outline: personal AI chats as `kind: 'assistant'`

- The `assistant` variant gains `tags: v.array(v.string())` and
  `screenContext: v.optional(...)`, which replace the JSON in the Agent thread
  summary.
- `AssistantChats.list` and `create` read and write `discussions` (`kind:
  'assistant'`, owner audience, `always` trigger) instead of
  `listThreadsByUserId` and summary parsing.
- The compact widget hooks (`use-assistant-chats`, `use-assistant`) move onto
  discussion routes. Private and discussion streaming converge on one path.
- The `thread.userId` fallback in `thread/access.ts` and
  `parseAssistantThreadSummary` are deleted.

Phase 2 gets its own implementation plan after phase 1 ships.

## Out of scope

- Link previews and unfurling (OpenGraph fetch).
- Rich text or markdown editing.
- Notifications or inbox entries for research activity.
- Reverse link lists on itinerary items.
- Discussions as link targets.
