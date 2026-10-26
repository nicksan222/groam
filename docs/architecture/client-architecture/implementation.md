# Client architecture implementation

This file describes how `apps/web` realises the decisions in the
[client architecture](README.md): boot, the workspace and reference layers
around the TanStack route tree, and how features adapt Convex operations. The pseudocode is
simplified from the source and keeps the real identifiers; when the two
disagree, the source wins.

## Boot and provider nesting

`main.tsx` mounts the router; the root route renders `AppLayout`, which creates the
browser's `ConvexReactClient` and renders `AppRoot` around the routed page. Journeys mount `AppRoot` as well.
Theme wraps authentication, which wraps the app. `App` adds the assistant
screen-context provider and the route error boundary; the root route's
`notFoundComponent` renders the not-found view.

```tsx
// pages/layout.tsx
export { AppLayout as default } from '@/app-layout';
// app-layout.tsx
<AppRoot client={browserConvexClient()}>{children}</AppRoot>
// app-root.tsx
<StrictMode><UiThemeProvider><GroamAuthProvider client={client}><App>{children}</App></GroamAuthProvider></UiThemeProvider></StrictMode>
// app.tsx
<AgentContextProvider><RouteErrorBoundary location={pathname}><Suspense>{children}</Suspense></RouteErrorBoundary></AgentContextProvider>
// pages/[...path].tsx
export { RouteNotFound as default } from '@/features/errors/route-error/route-not-found';
```

Source: [`layout.tsx`](../../../apps/web/pages/layout.tsx),
[`app-layout.tsx`](../../../apps/web/src/app-layout.tsx),
[`app-root.tsx`](../../../apps/web/src/app-root.tsx),
[`[...path].tsx`](../../../apps/web/pages/[...path].tsx),
[`provider.tsx`](../../../packages/auth/src/provider.tsx).

## Session gate

`App` renders a spinner while Convex auth loads, the lazily loaded
`AuthScreen` when signed out, and the routed page when signed in.
Requests that end or replace the session go through `changeSession` from
`SessionChangeContext`. It hides the page with React `Activity` before the
request starts, so mounted subscriptions cannot rerun against a dropped session
and throw "Not authenticated". A failed request shows the workspace again and
returns focus to the control that started it.

```tsx
const changeSession = async (request) => {
  focusedBefore.current = document.activeElement;
  flushSync(() => setChangingSession(true));            // commit the hidden tree first
  try { const result = await request(); if (result.error) setChangingSession(false); return result; }
  catch (error) { setChangingSession(false); throw error; }
};
if (isChangingSession && (isLoading || !isAuthenticated)) setChangingSession(false);   // Convex took over

<Authenticated>
  {isChangingSession && <LoadingSession />}
  <Activity mode={isChangingSession ? 'hidden' : 'visible'}>{children}</Activity>
</Authenticated>
```

Source: [`app.tsx`](../../../apps/web/src/app.tsx#L30),
[`use-session-change.ts`](../../../apps/web/src/features/auth/hooks/use-session-change.ts#L12).

## Code-based routes and thin page files

`apps/web/src/routes/route-tree.tsx` builds the route tree: `$tripId` is a param, the
pathless `workspace` route wraps every product page in `WorkspaceLayout` without adding a URL
segment, and each page in `apps/web/pages/(workspace)/*.tsx` (imported through `#pages/*`) is lazy-loaded. Vercel serves
`index.html` for client routes under `/app/`, so the browser mounts a client-only shell. Layout routes (such as
`chat`) stay mounted while their pages change, and the router enables view transitions through
`defaultViewTransition`.

Navigation goes through `@/lib/navigation/router`, a typed layer over TanStack
Router. `AppPath` in `types/navigation.ts` lists every page pattern, and
`Link`, `useNavigate` and `Navigate` take `{ to, params, search, hash }`.
`href()` in `lib/navigation/paths.ts` returns the plain path. A page file reads
params and search, applies redirects and renders one feature view.
Oxlint's `no-restricted-imports` rejects a page import outside its allowlist
(`@groam/*` packages other than UI, `@/features/`, `@/lib/` and
`@/app-layout`).

```tsx
// pages/(workspace)/trip-section.tsx
export default function TripSectionPage() {
  const params = useParams<{ section: string; tripId: string }>();
  const { section, tripId } = useResolvedParams(params);        // long ids from ReferenceProvider
  const { day } = useSearch(parseTripRouteSearch);              // `?day=N`, for Plan and Calendar
  if (!isTripSection(section)) return <Navigate params={{ section: defaultTripSection, tripId: params.tripId }} replace to="/trips/$tripId/$section" />;
  return <TripDetailView day={day} section={section} tripId={tripId as Id<'trips'>} />;
}
```

Source: [`route-tree.tsx`](../../../apps/web/src/routes/route-tree.tsx),
[`trip-section.tsx`](../../../apps/web/pages/(workspace)/trip-section.tsx),
[`navigation/`](../../../apps/web/src/lib/navigation),
[`navigation.ts`](../../../apps/web/src/types/navigation.ts),
[`lint.ts`](../../../tooling/oxc-config/lint.ts).

## Workspace provider and group switch

The workspace layout nests `WorkspaceProvider`, `ReferenceProvider` and
`WorkspaceShell`. `useWorkspaceData` combines the Better Auth session,
organization list and active organization, and yields a value only when the
active organization equals `session.activeOrganizationId`, so a group cached
from an older session is never exposed. Without an active group it activates
the first freshly listed one; without any group it shows create-or-join
onboarding. During auth refetches the last value is held for the same user.

A switch pauses first. `activateOrganization` writes the target into
`useGroupActivationStore` inside `flushSync`, which hides the old workspace
and drops its queries before the server changes the session. Once the session
reports the new group the store clears, and the `key` on the context remounts
the subtree so group-scoped state such as pagination cursors starts fresh.

```tsx
async function activateOrganization(organizationId) {
  flushSync(() => useGroupActivationStore.setState({ organizationId }));
  try { await setActiveOrganization(organizationId); }   // setActive + getSession({ disableCookieCache: true })
  catch (error) { useGroupActivationStore.setState({ organizationId: null }); throw error; }
}
const isSwitchingGroup = activatingId !== null && activatingId !== activeId;
<WorkspaceContext key={workspace.activeOrganization.id} value={workspace}>
  {isSwitchingGroup && <WorkspaceLoading />}
  <Activity mode={isSwitchingGroup ? 'hidden' : 'visible'}>{children}</Activity>
</WorkspaceContext>
```

Source: [`(workspace)/layout.tsx`](../../../apps/web/pages/(workspace)/layout.tsx),
[`workspace-context.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-context.tsx#L25),
[`use-workspace-data.ts`](../../../apps/web/src/features/workspace/hooks/use-workspace-data.ts),
[`use-organization-activation.ts`](../../../apps/web/src/features/workspace/hooks/use-organization-activation.ts#L84).

## Reference provider and canonical URLs

Params named `tripId`, `proposalId`, `issueId`, `discussionId`, `researchId`
and `runId` may hold a Convex id or a six-letter short id. `ReferenceProvider`
resolves each through `api.routes.references.resolve.run`, caches the result
under the alias used, the long id and the short id, and replaces the URL with
the short form once resolved. Descendants read long ids via
`useResolvedParams` or the wrapped `useParams`; the wrapped `Link` rewrites
params to short ids. The resolver returns `null` outside the caller's
organization or when `DiscussionAccess` refuses, and `ReferenceContent` then
shows "This page was not found or is unavailable to you."

```ts
for (const { key, table, reference } of referenceEntries(params)) {
  const live = results[key];                                  // useQueries, one resolve per key
  if (live) rememberReference(cache, table, reference, live);
  const result = live === undefined ? cache.get(`${table}:${reference}`) : live;
  if (result === undefined) loading = true; else if (result === null) missing = true;
  else { ids[key] = result.id; shortIds[key] = result.shortId; }
}
if (!loading && !missing && canonicalPath !== pathname)
  visit(appUrl(`${canonicalPath}${search}${hash}`), { replace: true });
```

Source: [`reference-provider.tsx`](../../../apps/web/src/features/workspace/workspace-shell/reference-provider.tsx),
[`use-reference-params.ts`](../../../apps/web/src/features/workspace/hooks/use-reference-params.ts),
[`navigation/`](../../../apps/web/src/features/workspace/navigation),
[`resolve.ts`](../../../packages/backend/convex/routes/references/resolve.ts).

## Shell-owned behaviour

`WorkspaceShell` composes `packages/ui` layout primitives (`SidebarProvider`,
`useSidebar`) with product behaviour: the sidebar, the reference-gated page,
mobile navigation, the assistant widget (keyed and error-bounded by
organization id), shared workspace dialogs and the command palette.

```tsx
<SidebarProvider><ConfirmDialogProvider>
  <WorkspaceSidebar />
  <ReferenceContent>{children}</ReferenceContent><MobileNavigation />
  <WorkspaceAssistantWidget organizationId={activeOrganization.id} />
  <WorkspaceDialogs />  {/* create-organization | invite | join */}  <CommandPalette />
</ConfirmDialogProvider></SidebarProvider>
```

Source: [`workspace-shell.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-shell.tsx),
[`sidebar.tsx`](../../../packages/ui/src/components/sidebar.tsx).

### Navigation

The trip is the only workspace, and one sidebar serves every device (below `md`
it opens as a sheet from a top app bar). It has three parts:

- **Header:** Search, which opens the command palette.
- **Trip block:** the trip switcher card, then the current trip's sections in
  reading order: Plan, Calendar, Ideas, Issues, Polls, Packing, Research, Chat,
  Activity, People. Each section is one row with its own route under
  `/trips/$tripId/<section>`; the labels, icons, layout (`fill` or padded) and
  header action come from `tripSectionConfig`. Counts on Ideas and Issues say
  what waits on the viewer, else what is open. The current trip is the route's
  trip, else the one remembered for this user and group. Group switching sits at
  the bottom of the switcher menu (a "Group: {name}" submenu) and in Settings ›
  Group.
- **Account footer:** Home, Inbox, Chats (conversations with no trip) and
  Settings, then the account menu.

The command palette is trip-scoped: Go to the trip's sections, the trip's
Ideas and Issues, Chats (this trip's first), and Switch to the other trips,
which keeps the section on screen. Off a trip it offers only the trips list.
It reuses the sidebar's subscriptions and reads nothing while closed.

Source: [`workspace-sidebar.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-sidebar.tsx),
[`trip-sections.ts`](../../../apps/web/src/features/trips/trip-sections.ts),
[`command-palette-results.ts`](../../../apps/web/src/features/workspace/hooks/command-palette-results.ts).

## Feature hooks over the generated API

Hooks in `features/<domain>/hooks` wrap `api.routes.*` from
`@groam/backend/api`, so views get backend-derived types. They subscribe with
`useQuery` or `usePaginatedQuery`, pass `'skip'` when an argument is missing,
and expose loading flags. Writes use `useMutation` or `useAction` wrapped in
`attempt`/`attemptValue`, which toast the failure and resolve to success or
`null`.

```ts
const open = usePaginatedQuery(api.routes.polls.list.trip.run,
  tripId ? { status: 'open', tripId } : 'skip', { initialNumItems: OPEN_PAGE });     // 50; closed: 10
const vote = (pollId, optionIds) => attempt(() => voteMutation({ optionIds, pollId }), 'Unable to vote');
```

Source: [`use-polls.ts`](../../../apps/web/src/features/polls/hooks/use-polls.ts#L13),
[`lib/errors.ts`](../../../apps/web/src/lib/errors.ts).

## Optimistic and provisional state

Slow, non-undoable actions (start or apply an idea) wait for the server and
run one at a time. A sent chat message shows a pending bubble keyed
`optimistic-user-N` until a message key outside the pre-send baseline arrives.
Poll selection keeps a pending choice only while the latest vote is in flight.

```ts
function withPendingUserMessage(messages, pending, threadId) {
  if (!pending || pending.threadId !== threadId) return messages;
  if (messages.some((m) => !pending.baselineKeys.has(m.key))) return messages;   // server copy arrived
  return [...messages, { key: pending.key, status: 'pending', author: { name: 'You', userId: 'pending' } }];
}
```

Source: [`use-discussion-thread.ts`](../../../apps/web/src/features/discussions/hooks/use-discussion-thread.ts#L234),
[`use-poll-selection.ts`](../../../apps/web/src/features/polls/hooks/use-poll-selection.ts).

## Scoped stores versus stable workspace data

The workspace context holds stable identity only: session, active
organization, role, organization list and `switchOrganization`. High-churn
state lives in Zustand: global stores such as `useWorkspaceDialogs` and
`useSidebarChromeStore` for shell chrome, and per-mount stores created inside
`useState` (`usePanelState`, `useListFilterState`,
`createDiscussionSendStore`) for one component instance. Stores hold drafts
and selection, never domain records or permission rules. The one persisted
device preference is the theme (`next-themes`, `storageKey="groam-theme"`).

```ts
export const useWorkspaceDialogs = create<WorkspaceDialogStore>((set) => ({ dialog: null, inviteContext: null,
  openDialog: (dialog, context) => set({ dialog, inviteContext: dialog === 'invite' ? (context ?? null) : null }),
  closeDialog: () => set({ dialog: null, inviteContext: null }) }));
export function usePanelState(initialOpen = false) {
  const [store] = useState(() => createPanelStore(initialOpen));      // one store per mount
  return useStore(store);
}
```

Source: [`workspace-state.ts`](../../../apps/web/src/features/workspace/workspace-shell/workspace-state.ts),
[`workspace-dialog-state.ts`](../../../apps/web/src/features/workspace/workspace-shell/workspace-dialog-state.ts#L21),
[`lib/stores/`](../../../apps/web/src/lib/stores),
[`theme-provider.tsx`](../../../packages/ui/src/components/theme-provider.tsx).

## Publishing screen context

Every workspace page tells Groam AI what it shows. A page renders one feature
view (`*View` from a `*-view.tsx` module, or only redirects), and that view
calls `useSetAgentContext` exactly once with a serializable
`AgentScreenContext` (`key`, `title`, `description`, `data`, `capabilities`,
optional trip `target`), or `null` while it has nothing to describe yet. A page
with no AI actions still registers a context with `capabilities: []` that says
so. Oxlint enforces the chain, so a new page cannot skip it:
`groam/page-renders-view` (pages), `groam/view-registers-agent-context` (view
files), and `groam/agent-context-owner` (no registration anywhere else, and
views rendered only by pages). Page files may not import the context hook.

Each mounted view is one screen with a stable id (`useId`); its context can go
from `null` to loaded without becoming another screen. The provider exposes the
newest mounted screen (`useCurrentAgentScreen`, `useCurrentAgentContext`), and a
registration reruns only when the JSON serialization changes. The assistant
widget reads the screen's conversation as soon as it registers (the newest
active chat with its `assistantConversationContextKey`, and its messages)
without writing; the first message on a page without one starts it through
`open`. Senders pass `serializeAgentScreenContext(context)` as `screen`; the
backend validates it with `AssistantScreens.validate`. The snapshot informs the
agent; tools still authorize on the server.

```ts
const id = useId();
const serialized = JSON.stringify(context);
useEffect(() => mount(id), [id, mount]);                     // the screen, while the view is mounted
useEffect(() => update(id, JSON.parse(serialized)), [id, serialized, update]);
// discussion-send.ts
if (result.assistantAgent && context)
  respondAction({ discussionId, promptMessageId: result.messageId, screen: serializeAgentScreenContext(context) });
```

Source: [`agent-context.tsx`](../../../packages/ai/src/ui/context/agent-context.tsx),
[`agent-screen-context.ts`](../../../packages/ai/src/ui/context/agent-screen-context.ts),
[`use-assistant.ts`](../../../packages/ai/src/ui/hooks/use-assistant.ts),
[`use-trip-agent-context.ts`](../../../apps/web/src/features/trips/hooks/use-trip-agent-context.ts),
[`discussion-send.ts`](../../../apps/web/src/features/discussions/hooks/discussion-send.ts),
[`agent-context.test.ts`](../../../tooling/oxc-config/agent-context.test.ts).

## Invariants and tests

- The workspace survives auth refetches, drops on sign-out, and hides during a
  group switch until the new group is active:
  [`workspace-context.test.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-context.test.tsx),
  [`use-organization-activation.test.tsx`](../../../apps/web/src/features/workspace/hooks/use-organization-activation.test.tsx),
  journey [`switch-groups.test.tsx`](../../../apps/web/e2e/group/switch-groups.test.tsx).
- A group cached from an older session is never exposed:
  [`use-workspace-data.test.tsx`](../../../apps/web/src/features/workspace/hooks/use-workspace-data.test.tsx).
- Session-ending requests hide the workspace until Convex takes over:
  [`use-session-change.test.tsx`](../../../apps/web/src/features/auth/hooks/use-session-change.test.tsx).
- References canonicalize once, never loop, and resolve known entities
  synchronously:
  [`reference-provider.test.tsx`](../../../apps/web/src/features/workspace/workspace-shell/reference-provider.test.tsx),
  [`use-reference-params.test.tsx`](../../../apps/web/src/features/workspace/hooks/use-reference-params.test.tsx);
  short ids keep access checks:
  [`references.test.ts`](../../../packages/backend/convex/modules/references/references.test.ts).
- Page files stay thin and import only allowed modules:
  [`imports.test.ts`](../../../tooling/oxc-config/imports.test.ts).
- A pending chat message yields to the server copy:
  [`use-discussion-thread.test.tsx`](../../../apps/web/src/features/discussions/hooks/use-discussion-thread.test.tsx).
- A loading view stays the same screen once it loads; the newest mounted view
  wins and the previous one returns on unmount:
  [`agent-context.test.tsx`](../../../packages/ai/src/ui/context/agent-context.test.tsx).
- Every workspace page registers its screen context exactly once:
  [`agent-context.test.ts`](../../../tooling/oxc-config/agent-context.test.ts).
- Reading a page's conversation never writes; the first message starts it:
  [`use-assistant.test.tsx`](../../../packages/ai/src/ui/hooks/use-assistant.test.tsx).

## Extending

- New page: a page under `apps/web/pages`, a route in the tree, an
  `AppPath` entry, and a feature view
  ([add-web-route](../../../.agents/skills/add-web-route/SKILL.md),
  [place-feature-view](../../../.agents/skills/place-feature-view/SKILL.md)).
  Name resource params after a key in `referenceTables` so they resolve.
- New subscription or write:
  [add-feature-hook](../../../.agents/skills/add-feature-hook/SKILL.md).
- New screen the assistant should understand:
  [register-agent-screen-context](../../../.agents/skills/register-agent-screen-context/SKILL.md).
- New sidebar entry:
  [add-sidebar-nav](../../../.agents/skills/add-sidebar-nav/SKILL.md); view
  coverage with mocked hooks:
  [add-web-view-test](../../../.agents/skills/add-web-view-test/SKILL.md).
