# Trip-first navigation

Status: done. Work landed on main.

## Target model

The trip is the only workspace. The account layer is thin: Home (your trips
and what needs you), Inbox (what happened), Settings. The group is a roster
trips can share, managed from Settings and shown inside a trip under People.

Trip sections follow the traveler's questions, not backend tables:

| Section | Holds |
| --- | --- |
| Plan | The agreed itinerary day by day, with a slim "your turn" strip. |
| Board | The whole trip at a glance: agreed plan, ideas, and every issue by status, as six lanes. |
| Calendar | The same plan on a calendar. |
| Ideas | Proposed changes to the trip, waiting for review. |
| Issues | Open questions and to-dos the group settles. |
| Polls | Quick votes. |
| Packing | Packing, gear claims, cost split per person. |
| Research | Research threads, linked to the decision they serve. |
| Chat | Trip chats. |
| Activity | History of every change. |
| People | The roster by RSVP, seats, group invites (Step 6A). |

The sidebar keeps these separate rather than merging them into queues: one row
each, with counts on Ideas, Issues and Polls (what waits on the viewer, else
what is open). Agents are participants, not a
destination: runs show on the item they work, in Chat, and in Activity.

Shell: one sidebar with two blocks. Top is the current trip (switcher plus
sections). Footer is the account (Home, Inbox, Settings, avatar). Mobile uses
the same navigation: a top bar with the trip switcher and the sidebar as a sheet.

## Working agreement

Every step is a bounded slice that leaves the app coherent. Each step runs
the same loop:

1. Pushback agent challenges the step brief before code.
2. Developer agent (Sonnet) implements with focused tests. Search agents
   also run on Sonnet.
3. Two adversarial reviews on Opus: a code reviewer judging elegance and
   correctness, and a design critic using the impeccable skill against the
   running app.
4. The lead fixes what the reviews surface, runs the gate, and reports.
5. The user gives feedback before the next step starts.

Groam has never been deployed or used, so there is no compatibility
obligation. Build toward the target model directly: no redirects for old
URLs, no legacy nav entries kept for their own sake. Journeys and test ids
are updated in the same step.

## Steps

### Step 1. Trip-first sidebar

The sidebar becomes the trip's navigation. Top block: a trip switcher (cover,
name, dates; menu with favorites, recents, All trips, New trip) and the trip's
sections as sidebar items with counts. The current trip is the route's trip,
else the last trip opened in this group, remembered on this device. Footer:
Home, Inbox, Agents, Settings, account. The nested Ideas, Issues and Chat
lists leave the sidebar. The trip page drops its tab strip; the cover header
stays. Sections keep today's names and routes in this step so journeys stay
green.

Evidence: sidebar never scrolls at 900px with a trip selected; every trip
section is reachable from the sidebar; switching trips keeps the section;
group and settings routes still show the account footer; journeys pass.

### Step 2. Decide

Superseded by Step 3c: Ideas, Issues and Polls are separate sections again, so
there is no merged Decide section or kind chip. The queue design below lives on
inside each of them.

A unified open-decisions queue replaces the Issues, Ideas and Polls sections.
One list over three kinds with "your turn" sorting, kind chips, and the
existing detail pages; polls expand inline. The board's To decide and Ideas
lanes point here with a kind filter. The old section keys are deleted (no
redirects). The assistant's screen vocabulary (`ideas`, `issues`) is stored
on agent runs and stays; the `decide` screen reports its data under the
`overview` section the way polls did. The sidebar count covers
issues and ideas only, because poll lists are paginated per subscriber.

### Step 3. Plan

Superseded in part by Step 3c: Calendar is its own section, not a view of Plan.

Overview, Calendar and Itinerary become views of one Plan section. "Suggest a
change" on Plan starts an idea working copy; "Flag" on any item raises a
Decide issue linked to it. The board retires; Plan is the trip's landing with
a slim "your turn" strip.

### Step 4. Chat and Research

Trip-linked chats list under the trip's Chat section, and research threads under
Research. The group Chat page shows only conversations with no trip. "Research
this" on an idea or an issue starts a research thread linked back to it.

### Step 5. Home and Inbox

Home becomes "your trips": trip cards with "your turn" counts plus one
cross-trip "your turn" list. Inbox is the informational feed. The group Ideas,
Issues and Agents pages are deleted, with no redirects (the detail pages for one
issue, idea, or agent run stay). Their back links point at the item's trip
section, or Home when it has none.

### Step 6. Pack and People

Packing gains the cost split. The travelers sheet becomes the People section
with roster and invites. The group switcher moves to Settings › Groups;
the trip switcher groups trips by roster when the user belongs to several.

### Step 7. Trip-scoped search

The command palette works on the current trip. Mobile already shares the
desktop navigation (decided in Step 1b: top bar with the trip switcher plus the
sidebar sheet), so there are no bottom tabs, and there are no `/t/:slug`
aliases; trips keep their short-id URLs. With a current shared trip (the
route's, an idea working copy standing for its trip, or the remembered one) the
palette offers, in order: Go to (the trip's sections, with their sidebar labels
and icons), the trip's Ideas and Issues, Chats (this trip's first at equal
score), and Switch to (the other trips, keeping the section on screen like the
trip switcher). Off a trip there is no Go to, and the trips list reads
"Trips". Agents leave the palette (agents are participants, not a destination).
The per-trip lists use the sidebar's own subscriptions and are skipped while the
palette is closed; only trips paginate (Load more).

### Step 8. Cleanup

Remove dead routes and components, update DESIGN.md, surface briefs,
architecture docs and the sidebar skill. Done; see the Step 8 log entry for
what went and what stayed.

## Log

- Step 1: sidebar rebuilt trip-first. Reviews (code + impeccable) found
  duplicated Ideas/Issues links, two look-alike switchers, and vanishing
  counts; all fixed. User feedback: no generic links below the trip block.
  Final sidebar: group switcher + search, trip card + sections, footer
  Home/Inbox/Settings/account.
- Step 1b (user feedback): one navigation on every device (mobile top bar +
  the same sidebar sheet, no tab strip, no bottom bar); Chat becomes a trip
  section listing trip-linked chats; the cover header leaves every trip
  page in favour of a compact section header; Board and Calendar run
  full-bleed; each section page curated. Reviews (code: no blockers, twelve
  simplifications; impeccable: 26/40, three P1s) folded into one fix round:
  section-specific primary action, phone full-bleed, draft strip on idea
  working copies, Travelers in the trip menu, one `tripSectionConfig`, one
  `useTripDiscussions` hook, favourite flag out of `trips.find`. Committed
  on main as 4dec46b6. Work now lands on main with a commit per round.
- Known nits after step 1: kloq calendar still announces "January 1" in a
  few labels for undated trips; `routes/trips/cover/retry` has no client
  caller; journeys not yet run against the new helpers.
- Step 2: Decide shipped, then a fix round. One `decide` section replaces
  `issues`, `ideas` and `polls` (no redirects). `features/decide` merges the
  trip's issues, ideas and polls into one queue sorted by whose turn it is:
  rows are kind-neutral (a muted icon and word; only the status is tinted),
  grouped Your turn / Waiting on others (or Settled), with a 2px bar on the
  viewer's rows; search plus two segmented controls, Kind (`?kind=`) and Show
  (`?show=`); polls expand inline into their options. The header gets a generic
  New menu (Idea, Issue, Poll) from a `primaryAction` list; the panel owns the
  issue and poll dialogs. Polls gained `updatedAt` (created or closed), and the
  poll view now reports `canVote`/`canClose` false on archived trips. The
  sidebar Decide count comes from the same queue builder (viewer's turn, else
  open; issues and ideas only; archived-aware); the assistant context has one
  `decide` entry reported as `overview`. Issue detail and idea pages mark
  Decide active, and the issue crumb reads Trip > Decide. Old panels, the idea
  version row and the lists' `showTripName` props are deleted. Journeys were
  updated but not run. Deferred: per-kind counts on the segments, a delete
  route in the UI for polls.
- Step 3: Plan shipped. One `plan` section replaces `board`, `overview`,
  `calendar` and the `itinerary` redirect (no redirects; an unknown section
  falls back to Plan, the trip's landing). `/trips/$tripId/plan?view=days|calendar`
  (`?day=` works in both): a shared `SegmentedControl` (now in `packages/ui`,
  Decide uses it too) switches Days, the reading plan with the route rail and
  budget badge in the padded body, and Calendar, the plan on a calendar that
  fills the page and opens at 8 AM. Plan is `fill` only for the calendar view
  (`tripSectionLayout`). A slim "Your turn" card tops the days view: up to three
  of the viewer's open issues and ideas from the Decide builder (same
  subscriptions as the sidebar count, archived trips show none), "N of M
  mandatory done", and See all into Decide's Yours; hidden when empty. The
  header's button on Plan reads "Suggest a change" (`primaryActionLabel`, phrased
  in `idea-glossary.ts`) and starts an idea on the itinerary; New idea stays out
  of the trip menu there. The Board is deleted (components, drag-and-drop hooks,
  fullscreen toggle, `tripBoard*` ids, journey helpers and locators, the
  move-issues journey). Types split: `TripTabSection` is the six shared
  sections; an idea's working copy keeps `IdeaCloneView` and gets
  `ActiveIdeaSection` (the shared `ActiveTripSection` no longer branches on
  working copies, and the shared-trip navigation helper is gone because a shared
  trip is never editable). The assistant sees `plan` as `overview` with the
  view in its data; `packages/ai` and the backend validator are untouched.
  Journeys were updated (`openIssueFromTrip` and the rule/create journeys read
  Decide; `openPlanView`, `openTripDecide`, `expectDecideItem` are new) but not
  run. Deferred: Flag with an issue target (3b), budget and map views, opening a
  working copy at a day, `?view=` on idea pages, and the backend `issues.move`
  route and `boardRank` plus `@groam/ui/lib/board-card` recipes (Step 8
  cleanup).
- Step 3c (user feedback: "keep more sidebar stuff, like separate calendar from
  plan, and issues from ideas"): the merged sections split back into separate
  sidebar rows, in order Plan, Calendar, Ideas, Issues, Polls, Packing,
  Research, Chat, Activity. There is no `decide` section and no `?view=` or
  `?kind=` switch (no redirects). Calendar is its own fill-layout section
  (`/trips/$tripId/calendar`, `?day=`); Plan is the days view only and stays the
  landing. Ideas, Issues, and Polls each render the shared queue (now
  `features/trip-queue`, `QueuePanel` fixed to one kind, subscribing to that one
  list) with the turn grouping, title search, and the `?show=` control; the Kind
  control and the kind icon and word on rows are gone. Each has its own button
  (New idea, New issue, New poll), description, and empty state; the header's
  New menu is deleted. Sidebar counts: Ideas and Issues show the viewer's-turn
  count, else open, from the same builder; Polls shows none, because poll lists
  are paginated per subscriber. Plan's "Your turn" strip keeps three rows and
  ends with "N more in Ideas" / "N more in Issues" links to `?show=yours`; the
  single See all is gone. Idea pages mark Ideas active, issue pages Issues (crumb
  Trip > Issues). The assistant keeps `ideas` and `issues` as stored, and reads
  Polls and Calendar as `overview`; Plan's agent data no longer carries a view.
  Deferred: backend `issues.move` and `boardRank` cleanup (Step 8), Flag with an
  issue target (3b), budget and map views.
- Step 3b: Flag on plan items. An issue can point at one plan item (destination,
  activity, stay or one of the three transfer kinds, never the trip or a file):
  `tripIssues.subject`, accepted by `issues.create`, checked with
  `TripTargets.assertInTrip` (so another trip's item, an archived trip and a
  working copy are all refused). The issue read resolves it into
  `about: { type, id, label, day } | null` and `subjectMissing`; nothing cascades
  when the item is deleted, so `about` turns null and the sidebar's About section
  says "No longer on the plan". On Plan every activity, transfer and stay card gets
  a quiet Flag (hover or focus on fine pointers, always visible on touch) only from
  `TripPlanPanel`: idea working copies, the read-only destinations view and
  archived trips offer none. Flag opens the create-issue dialog with a read-only
  "About <item>" line and "Question about <item>" as the title; the issue page
  links the item to `/trips/$tripId/plan?day=N`. Journeys not run.
- Step 4: trip chats live in the trip. `/trips/$tripId/chat/$discussionId` renders
  the thread inside the trip (seat gate, Chat active in the sidebar, the back arrow
  returns to the trip's Chat section). `/chat` lists only chats with no trip and
  its create dialog has no trip picker; from a trip the dialog is locked to that
  trip. `/chat/$discussionId` for a trip chat resolves to its canonical trip page
  next to the research redirect (an id lookup, not a legacy alias); links that know
  the trip (`chatHref`: trip chat rows, queue poll card, command palette, agent
  runs) go there directly. `Discussions.create` with a trip now loads the shared
  trip (no working copies), refuses archived trips, and refuses any member, the
  caller included, who holds no seat. Journeys: `createTripChat`,
  `expectTripChat`, `expectNotInChatInbox` and a new `chat-in-a-trip` journey
  (not run). Step 7 drops the mobile bottom tabs.
- Step 4 fix round (code review of the Flag work and screenshots of trip chats):
  - Flag. One name for a transfer: `transfers/labels.ts` (backend) owns the mode
    labels and `transferLabel`/`boundaryEnds`; the planner, the transport option
    list and an issue's `about` all use it, so a boundary transfer reads
    "Flight · Arrival → Lisbon" everywhere. `about` is now the plan-item union
    (`planItemAbout`, type `PlanItemAbout`) and `about.ts` has one resolver per
    kind; a stay links to its check-in day, a transfer with no timing has
    `day: null` and its link has no `?day=`. The web target is `IssueFlagTarget`
    (`{ label, subject, topic }`), built by the planner with no cast;
    `stayFlagTarget` serves the day card, the check-in and check-out entries and
    the editor canvas. Travel titles read "Question about the taxi to Museum". Flag
    stays visible at reduced opacity on hover-capable devices (full on hover or
    focus) and has a 32px hit area on touch. The title limit is one shared
    constant (`issues/limits.ts`); the flag dialog asks "What's the question?",
    shows "About <item>" as a chip with the item's icon, and the description is
    optional (the backend accepts an empty one).
  - Trip chat dialog: copy and placeholder fit a trip; the People list is the
    trip's travelers only (`discussions.roster` takes a `tripId` and keeps members
    with a seat), all preselected, with a visible checkbox per row in both
    dialogs. The sidebar's Chat badge counts unread trip chats and is hidden at
    zero. The thread header in a trip matches the section headers' height and rule
    and carries a "Chat" crumb (which replaces the back arrow there).
  - Research: seeded titles and briefs no longer bake the trip name in (the
    seed's "Arrival plans" chat too); existing rows are untouched, no reset. Rows
    mark unread with the queue's bar.
  - Activity: "You" for the viewer, no jargon chip, a per-kind icon, rows grouped
    under "Today"/"Yesterday"/date headings (`RecordList` gained `groupLabel`) with
    the time only on each row; the action filter uses plain words.
  - Packing: the header's button is "Suggest gear changes" (an idea on packing);
    the footer duplicate is gone (the empty state keeps its one action).
  - Chats with no trip are back in navigation: a "Chats" row in the account footer
    (Home, Inbox, Chats, Settings) with an unread badge, active on `/chat` routes;
    the add-sidebar-nav skill is updated. Journeys updated (`createTripChat` expects
    every traveler already invited) but not run.
- Step 5: Home and Inbox. One new workspace query, `trips.turn`, returns the
  viewer's counts per trip and one capped list (20 rows, soonest due first, with a
  total) over the trips `listTrips` shows: no archived trips, and none the viewer has
  no seat on, at most 12, favourites first. Per trip it builds the context once and
  reuses `TripIssues.list`, `TripVersions.list` and the first 50 open polls
  (`PollReads.listOpenForTrip`, a `take` because a query may paginate only once);
  the issue and idea reads gained a `bounded` option so a trip past its idea cap
  cannot fail every other trip. The turn rules live in one pure module
  (`modules/travel/turn.ts`: issue, idea, poll, the viewer's draft and open idea);
  the web queues, the sidebar counts and Home import it, so there is one rule. The
  trip list item gained `canParticipate`. Home (`features/dashboard`, still
  `homeDashboard`) is the header, Your trips (cards from the old Continue-planning
  rows: counts link to `?show=yours`, favourites first, six at most, "All trips")
  and Your turn (one list in the queue row style with the trip as a chip, "N more in
  Trip · Section" links when capped, "Nothing is waiting on you."). States: a
  placeholder while loading (never a zero), a first-trip screen, and "See archived
  trips" (`/trips?status=archived`, which the trip list now reads) when only archived
  trips exist. Waiting, Recent ideas, Drafts, Settled, agent waits and activity,
  assigned and open issues, open polls, research and the group links are gone, with
  their hooks and fixtures. Inbox copy no longer promises invites. Deleted pages:
  `/ideas`, `/issues`, `/agents`, `/group`, `/group/$section` (no redirects), with
  `features/ideas/idea-list` (views, rows, columns, empty state),
  `features/issues/issue-list` (the same) and `features/agents/agent-list`; the
  command palette's "All agents" entry and Settings' "Background activity" link; the
  `/ideas` and `/issues` index entries of the assistant's visibility (their detail
  pages keep it). Back links: not-found screens go Home (the idea clone view goes to
  its trip's Ideas), and a run goes back to its issue's, idea's or chat's trip
  section, else the trip's Activity, else Home. Dead backend routes removed with
  their tests: `polls/list/open`, `discussions/research/workspace`,
  `trips/versions/workspace/all` and `pending`, `trips/issues/workspace/all`, and
  `agents/runs/workspace` (both). Trip-less chat polls leave Home: the Chats badge in
  the sidebar footer is their only prompt. Journeys moved to the trips' queues
  (`openIdeaFromQueue`, `openIssueFromTrip` with `show`); the workspace idea and
  issue search journeys and "start an idea from workspace" are deleted. Journeys not
  run.
- Step 5 fix round (Opus code review and a screenshot pass).
  - Reads. `trips.turn` no longer reuses the full lists. Per trip it loads the trip
    context once and reads only what can wait on the viewer: raw issue rows (no
    conditions, rule facts or ideas) filtered by `isIssueYourTurn`; ideas under review
    through a new `by_sourceTripId_and_status` index plus the viewer's own open ideas
    through the author index, with approvals read only for ideas under review; and open
    polls with one vote lookup per poll and the voters loaded once per trip. Cost per
    trip no longer grows with the itinerary. The `bounded` options on the issue and
    idea lists are gone. A trip's short id travels with each item, and the result says
    `checked` (trips read, at most 12) and `truncated`; Home then words an empty list as
    "Nothing waiting in your 12 most recent trips" and notes the limit under a list.
    `OPEN_POLLS_FIRST_PAGE` moved to `modules/polls/limits.ts` and the web imports it
    (counts match the sidebar up to that size, and can differ past it).
  - Home. Your turn comes first (five rows, "N more in Trip · Section" links, and
    "and N more in other trips" when the links run out), then Your trips. One
    `TripCard` (`features/trips/trip-card`) serves Home and `/trips`: the cover only
    when it exists (112px) or an initial tile, equal heights, counts pinned to the
    bottom, aria-labels that name the count, its noun and the trip. The old trip-list
    cards, idea timeline pane and recent-activity ordering are deleted; the page reads
    "Every trip in this group, active and archived." and its status filter writes
    `?status=` to the URL. The shared header keeps the action on the title's row on
    phones. `turnItemPresentation` (queue-items) gives Home's rows the same link and
    pill as the queues, with one kind to section map (`queueKindSection`). The agent
    context describes only the trips shown. Inbox's empty state matches the feed.
  - Cleanup. `features/ideas/idea-list` and `features/issues/issue-list` are gone
    (`idea-page-copy` sits beside the glossary; the create-issue dialog and flag chip
    in `issues/shared`); unused ids removed.
  - Checked, no change. A run's trip is always the shared trip (issue and review runs
    store the source trip, chats the chat's trip), so `agentRunBack` needs no mapping.
    The sidebar's remembered current trip already feeds the switcher off trip routes
    (`useCurrentTrip` reads the remembered short id when the route names no trip); a
    session that began on Home and has not opened a trip yet shows "Choose a trip".
  - Tests: cap (22 rows), 13 trips, favorites order, working copies, the author's
    apply turn, a poll the viewer cannot vote in, the pure predicates, and a Home
    journey (`e2e/home`, not run).
- Step 6A: People. A tenth trip section, after Activity (Users icon, no sidebar
  count), replaces the Travelers sheet and its trip-menu entry (the sheet, its test and
  the `tripActionTravelers` and `tripTravelers` ids are gone; `tripPeoplePanel`,
  `tripPeopleLink` and `tripPeopleInvite` are new). `features/trips/trip-people` holds the
  page: the roster grouped Going, Invited (going without a seat, with a line saying a seat
  is needed), Maybe and Not going, "You" on the viewer's row, an RSVP select per row (own
  row, or anyone's for organizers); the Stripe seats panel (`TripPaymentsPanel`, moved
  here, copy now "Seats"); "Invite to group" for group owners and admins only, opening the
  existing `InviteDialog` with copy that it adds someone to the group and so to every trip;
  and one quiet "≈ amount planned per traveler" line (`plannedPerTravelerLabel`, hidden
  with no planned cost or nobody going). Archived trips say RSVPs and payments are
  read-only. Plan's "N in group · M going" is now a link to People. The Stripe return URL
  is `/trips/:shortId/people` (`tripReturnUrl`; the Stripe test double now records
  `success_url` so a convex test asserts it). The assistant reads People as `overview`
  (stored vocabulary unchanged) with the traveler list and, unless archived, the
  `trip.traveler.set` capability. `setMyTripRsvp` opens People through the sidebar and
  returns to the section the journey was on. Journeys not run. Stale: the landing's
  pricing copy still says "cover them from Travelers" (apps/landing, translated).
- Step 6B: group switching moved, not hidden. The sidebar header keeps Search only
  (`OrganizationMenu` is deleted). The trip switcher menu ends with a "Group: {name}"
  submenu (`TripSwitcherGroupMenu`) that lists the other groups and offers Join with code,
  New group and Group settings; it also shows in the "Choose a trip" empty state. The
  `groupSwitcher`, `groupSwitcherItem`, `groupSwitcherJoin` and `groupSwitcherNew` ids moved
  onto it, and the trip switcher's trigger carries `data-group-name` so journeys can read the
  active group without opening a menu (`expectCurrentGroup`). Settings › Group opens with a
  Groups list (`GroupsSettings`: switch, join, new; switching there stays on the page). One
  hook, `useSwitchGroup`, serves both. Journeys `switch-groups`, `invite-a-member` and the
  sign-up journey, plus `tooling/app-actions` `group.ts` and the sidebar view tests, were
  updated; journeys not run. The landing pricing copy now points to People (and Persone in
  Italian) instead of Travelers.
  Cuts, both recorded on purpose:
  - The cost split is a separate future feature with its own data model (Step 6 had
    bundled it into Packing). Nothing of it ships here; the People page shows only the
    planned-per-traveler fact line.
  - The cross-group trip switcher (trips from every group in one menu) is deferred: it needs
    an auth and data design, since a session is scoped to one active group today.
- Step 6 fix round (code review plus screenshots).
  - People. Invited rows (going without a seat) cannot be set to Going; the row says
    "Needs a seat. Cover it in Seats." (or "Pay for it" on your own row) and the seat button
    reads "Cover €1" for someone else. The seats copy says what is true for the viewer (an
    organizer can cover anyone; a member is told an organizer can cover them). Rows lost the
    repeated handle; a row you cannot change says its status in plain text, one you can change
    has a ghost select; your own row leads its group. Layout is two columns: roster left, a
    sticky aside right (first on phones) with the summary line and the Seats panel, which
    drops its own archived notice when embedded. "Invite to group" is the header's button
    (`SectionAction`, `primaryAction: 'invite'`) for owners and admins, and the invite dialog
    now says the person joins every trip. The per-traveler figure uses `trip.travelerCount`
    (new on the trip read, the count the plan was priced with) and rounds to cents; Plan's
    "N in group · M going" reads the same field, so People no longer needs a second
    subscription for it.
  - Groups. The trip switcher card shows `Group · Role` above the trip name (visible at rest
    and in its accessible name; `data-group-name` stays), the Group submenu has a gap after
    its icon and a test id on Group settings, and the menu opens under the card in the phone
    sheet, where there is no room beside it. `useSwitchGroup` starts the Home navigation
    together with the switch. Settings › Group: the Groups card is one compact block; its
    rows use `aria-labelledby` and empty avatar alts; "Create code" left the page header for
    the Invitation codes panel (owners and admins only), the one place to create codes in
    Settings. `switchGroup` returns early when the group is current, and the `switch-groups`
    journey checks the trip switcher's `data-trip-name` moves off the other group's trip.
    Journeys not run.
- Step 7: command palette is trip-scoped. Groups: Go to (the ten sections from
  `tripSectionConfig`, reading order, linking `/trips/$tripId/$section` with the
  short id), Ideas and Issues (the current trip's only, from `useTripVersions` and
  `useTripIssues`, the same subscriptions as the sidebar counts so Convex serves them
  once; other travelers' drafts hidden; ideas use `ideaOpenHref`), Chats (this trip's
  first at equal score, via a tie-break priority), and Switch to (other trips, short id,
  current section kept). Off a trip: no Go to, and the list is titled Trips. The Agents
  group, `agentHref` and `useAgentRoster` are deleted (the roster was subscribed even
  while the palette was closed), as are the dead `useWorkspaceIdeas` and
  `useWorkspaceIssues` list hooks, which pointed at routes removed in Step 5; the
  create hooks in those files stay. `useTripVersions`/`useTripIssues` accept a missing
  trip id (skipped). Only trips keep Load more. Copy drops agents and mentions
  sections and trips. No journey used the palette, so none changed. Deferred: the
  `agents/list` backend route is left for Step 8.
- Step 8: cleanup. Gone from the backend, with their modules, validators and
  tests: the issues `workspace/list` and `move` routes (`TripIssues.listWorkspace`
  and `move`, `loadTripView`, the `workspaceListItem` validators, the list item's
  `rank`; status changes are one `setStatus` path now and lists read newest first),
  `modules/travel/issues/board.ts` (its `issuesOf` lives in `read.ts`, `MAX_ISSUES`
  in `limits.ts`), every `boardRank` write and read; the ideas `workspace/list`
  route (`presentWorkspaceIdea`, its validator and the `tripProposals`
  `by_organizationId_and_updatedAt` index); `travelers/claim`
  (`claimInvitation`, `tripTravelers.invitationId` and its `by_invitationId` index,
  the roster's `invitationId`); `trips/cover` and `trips/cover/retry` (nothing in the
  client called them; creation, `covers/ensure` and the stock generation are the only
  cover triggers and stay), with `TripCover.set`, `retry`, `commit.setCover` and
  `discardTripUpload`; `polls/list/workspace` (`listForWorkspace`, its testing
  helper); `agents/issues` (`AgentRuns.assignedIssues` and its validators) and
  `agents/list` (the roster is still built for `agents/get`); the `trip_invite`
  notification kind (nothing produced it, no rows). Kept: the issues
  `by_organizationId_and_updatedAt` index (the agent roster counts assigned issues
  with it) and `tripIssues.boardRank`, now `v.optional` and never read or written:
  stored issues still carry it and the live schema would refuse them without a data
  reset, so drop the field after the next reset. Web: `issue-card.tsx`,
  `trip-list-order.ts`, `useWorkspaceTripProposals`, the issue-list agent context,
  the unused `findViewerPendingIdea`/`pinViewerOpenIdeas` helpers, the `issueCard` id,
  and the `@dnd-kit/*` dependencies (and lockfile entries) are removed;
  `WorkspaceIssue`/`WorkspaceIdea`/`WorkspaceTripProposal` became `TripIssue`,
  `IssueDetail`, `TripIdea` and `TripProposal`, typed from the per-trip list routes.
  `@groam/ui/lib/board-card` is replaced by `@groam/ui/lib/chip` (`chip`, `chipTone`;
  the unused card recipes are gone). `open-trips.ts` keeps `overview`: it is the idea
  working copy's own tab, and a shared trip's plan is `plan` (commented). Fixes:
  `use-polls` and `use-queue-items` have tests for their open-first paging, summary,
  remove and failure paths, poll and idea kinds, archived trips and the default feed,
  so the coverage thresholds pass unchanged; undated trips never print a made-up
  date: the kloq `overrideFullDate` hook gained `hostDayName`, which the weekday
  names, view title and range announcement (`view.ts`, `navigation.ts`,
  `use-view-navigation.ts`) and the timeline block, app and header consult, with a
  view test that scans every visible string and accessible name. Docs: DESIGN.md,
  the trip surface brief, both architecture pages, the sidebar skill (synced) and
  the collaboration implementation page match the final navigation (ten trip
  sections, footer Home/Inbox/Chats/Settings, group switching under the trip
  switcher, trip-scoped palette); the stale workspace-databases surface brief is
  deleted. Gate: typecheck, lint, web unit+views, backend, ui and package tests and
  the full fallow audit all pass. Journeys were not run in any step of this plan.
- Final polish (design critic round, 27/40): one page header for every page (shell
  header and `trip-page-header.tsx` share `SHELL_PAGE_INSET` = `px-4 md:px-6`,
  `py-3 sm:py-4`, `text-xl` titles, and filled `Button size="sm"` primary actions that
  keep their label on phones); Chats uses it too (title, description, New chat) with a
  quiet empty pane. Home's Your turn footer is one row (toggle plus a muted "N more in
  other trips" / "from your 12 most recent trips" note). "Waiting on you" rows share
  `QueueDueChip` and order chips state then due; Plan's strip row is a `[1rem_1fr]`
  grid with two-line titles. Packing labels clamp to two lines and the claim button is
  icon-only on narrow cards; `tabular-nums` moved onto number spans (and off relative
  times and the section badge). Segmented control, activity toolbar and rows (new
  icons, wrapping titles), research rows (no icon, no bar), `/trips` cards (shared
  `TripCardGrid` with the turn counts), overdue chip says only "Overdue" on the issue
  page, inbox empty state (Go to Home, serial comma), Plan's phone facts line and
  "M going" when the group is all going, sidebar waiting counts as primary pills,
  queue headings for any group when a row is yours (and "Settled"), "opened this
  issue" on the description, "Newest first" sort label, inline "Start an idea" (the
  gear popover and `issueEditIdea` id are gone), "1 stop", group row initials. Tests
  updated or added for the header, Home footer, Chats, `/trips`, inbox, queue
  headings, sidebar pills, issue comment and sidebar. DESIGN.md matches. Journeys not
  run (dev servers down).
- Board returns (user: "I loved the kanban board! Can we take it back!"): `board` is a trip
  section again, right after Plan, with the `SquareKanban` icon, `fill` layout and the New
  issue header button; no sidebar count and Plan stays the landing. It is a status board
  only: four lanes from `ISSUE_STATUSES` (the agreed plan and idea lanes stay gone), the
  viewer's cards first via the exported, generalised `compareQueueItems`, Done capped at 20
  with "Show all N", Won't do folded to a strip. Cards use the chip vocabulary; moves go
  through the existing status mutation with an optimistic patch and a client-side
  `statusChangeRefusal` check, and the card menu is the accessible path on every device.
  Phones show one lane (`?lane=`, defaulting to the lane with the viewer's cards). Filters:
  title, Show (`?show=yours`), Assignee, Mandatory. Recorded cuts: no backend change (no
  `issues.move`, no `boardRank`, so no manual ordering inside a lane); no fullscreen toggle,
  horizontal pan hook or history/plan footer links; no drag
  until the second commit, which adds `@dnd-kit/core` (cards lift with a mouse or the keyboard, lanes
  are the drop targets, no sortable, no touch sensor, no drag on phones); the
  Show filter means "assigned to me" in every lane, not only open ones; the assistant reads
  the Board as Issues. Journeys were not run.
- Board fix round (review of the drag commit, plus screenshots): a drag released outside every
  lane now cancels (mouse: `pointerWithin`; keyboard: centre check, no fallback); the click that
  ends a drag over the card's own original no longer follows its link; a keyboard drop returns
  focus to the moved card and a drop on the folded Won't do opens it; the folded strip shows a
  refusal in a compact note beside it; the lifted preview is inert (plain title, plain avatar,
  `aria-hidden`); the drop hint is no longer a status region. Drag state is dnd-kit's own
  (`useDroppable` active and `isOver`, `useDndContext`), with no context or `track` handlers of
  ours, and `onMove` is the drop handler. The optimistic `closedAt` mirrors the backend's
  `nextClosedAt`; the move menu and assignee triggers stop mousedown so they never arm the drag;
  quick add keeps text typed while saving and clears the filters (with a toast) when they would
  hide the new card; the section line is device-neutral; `memo` and a dead `canManage` branch are
  gone; "yours" means assigned to me in both the lane count and the Show filter. Phone: the
  toolbar is a search plus a Filters popover with a badge; the lane switcher sets its counts
  apart; met condition chips use the chip's own type with a success tint (`chipTint`), since
  only the Mandatory label mark still uses the uppercase lozenge tone. Tests: a mouse drag
  (threshold, drop, outside every lane, click after a drag), focus after keyboard drops, the
  folded strip's note, and the inert preview; the waits are now on `data-dragging` and
  `data-over`, and the drag tests no longer resize the window, since dnd-kit cancels a lift on
  resize.
- Board restored to its original look (user: "It's much uglier than before!"): the board is the
  old board again, from `38e41842`, with the new behaviour kept only where it does not change
  the look. Six lanes (Agreed plan, Ideas, To decide, In progress, Done, Won't do) in one
  horizontal scroller that fills the page, `w-72` lanes on `bg-muted/50` with the old header
  (name, count, a line of what the lane is for) and a dashed quiet Won't do; the folded Won't
  do rail and the four-column grid are gone. The old card language is back in
  `@groam/ui/lib/chip` (`cardSurface`, `cardTitle`, `cardMetaRow`, `cardChipInteractive`,
  `cardStretchedLink`; the chip and tone recipes were already there): issue cards have the
  status colour bar with the assignee at the right and no avatar until hover when unassigned,
  one chip row (Mandatory lozenge, condition, due, idea), struck-through settled titles; the
  `…` menu rests out of sight on a fine pointer and always shows on touch. The Agreed plan lane
  (glance card, Day headings, plan entries opening Plan at their day) and the Ideas lane (status
  lozenge, standing chip, who and when, Open chip, the issue/idea hue pairing) are restored. The
  drops onto them are safe: an issue dropped on Ideas starts an idea and stays on the board with
  an "Open idea" toast action; an idea dropped on Agreed plan is applied only after a confirm and
  only when it can be applied; everything else is refused with its reason, in the lane, in the
  announcement and (for the keyboard) in a toast. The issue menu gained "Start an idea" and an idea
  card's menu "Apply to plan…". The toolbar is one compact row aligned with the lanes; phones
  keep search plus Filters and get the old sticky pill tabs (six lanes, one at a time,
  `?lane=` takes `agreed` and `review` too). The "No issues yet" and "No cards match" screens
  are gone: every lane stays on screen, as a drop target, with its own copy. The "· N yours"
  count is dropped (the Show filter's Yours stays). Cuts that remain: no mouse-pan of the
  scroller, no fullscreen toggle, no lane footers (the old "See the full plan", "All ideas" and
  history links), no manual order inside a lane (still no `boardRank` or `issues.move`).
- Deferred, everything still open:
  - Cost split per person (its own feature and data model); People shows only the
    planned-per-traveler line.
  - Cross-group trip switcher (needs an auth and data design; a session is scoped to
    one group).
  - Budget and map views on Plan; opening a working copy at a day; `?view=` on idea
    pages.
  - Per-kind counts on the Ideas, Issues and Polls segments; a delete action for
    polls in the UI.
  - Replacing or regenerating a trip's cover after creation (the routes were removed
    as unused; rebuild them with a UI if wanted).
  - Dropping `tripIssues.boardRank` from the schema once local data is reset.
  - Running every journey against the new helpers (they were updated, never run), and
    a flaky `trip-currency-select` view test that failed twice in three full web runs
    and passes alone.
