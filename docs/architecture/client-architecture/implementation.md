# Client architecture implementation

This file describes how `apps/web` realises the decisions in the
[client architecture](README.md): boot, the workspace and reference layers
around the router, and how features adapt Convex operations. The pseudocode is
simplified from the source and keeps the real identifiers; when the two
disagree, the source wins.

## Boot and provider nesting

`main.tsx` creates one `ConvexReactClient` with `expectAuth: true` and renders
`AppRoot`, which journeys mount as well. Theme wraps authentication, which
wraps the app. The router is created per mount; the root route adds the
assistant screen-context provider and the route error and not-found views.

```tsx
<AppRoot client={new ConvexReactClient(env.convexUrl, { expectAuth: true })} />
// app-root.tsx
<StrictMode><UiThemeProvider><GroamAuthProvider client={client}><App /></GroamAuthProvider></UiThemeProvider></StrictMode>
// router.tsx
createRouter({ basepath: env.baseUrl, defaultPreload: 'intent', defaultPreloadStaleTime: 30_000, routeTree, scrollRestoration: true });
// routes/__root.tsx
createRootRoute({ component: () => <AgentContextProvider><Outlet /></AgentContextProvider>,
                  errorComponent: RouteError, notFoundComponent: RouteNotFound });
```

Source: [`main.tsx`](../../../apps/web/src/main.tsx),
[`app-root.tsx`](../../../apps/web/src/app-root.tsx),
[`router.tsx`](../../../apps/web/src/router.tsx),
[`__root.tsx`](../../../apps/web/src/routes/__root.tsx),
[`provider.tsx`](../../../packages/auth/src/provider.tsx).

## Session gate

`App` renders a spinner while Convex auth loads, the lazily loaded
`AuthScreen` when signed out, and the lazily loaded router when signed in.
Requests that end or replace the session go through `changeSession` from
`SessionChangeContext`. It hides the router with React `Activity` before the
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
  <Activity mode={isChangingSession ? 'hidden' : 'visible'}><AppRouter /></Activity>
</Authenticated>
```

Source: [`app.tsx`](../../../apps/web/src/app.tsx#L30),
[`use-session-change.ts`](../../../apps/web/src/features/auth/hooks/use-session-change.ts#L12).

## File-based routes and thin route files

TanStack Router generates `routeTree.gen.ts` from one file per route; the
pathless `_workspace` layout wraps every product route. A route file reads
params and search, applies legacy redirects and renders one feature view. The
conventions linter reports `route-imports` when a route file imports anything
other than the router, `@groam/*` packages except `@groam/ui`, `@groam/ai/ui`,
`@/features/` or `@/lib/`.

```tsx
export const Route = createFileRoute('/_workspace/trips/$tripId/$section')({
  component: TripSectionRoute, validateSearch: parseTripRouteSearch });
function TripSectionRoute() {
  const params = Route.useParams();
  const { section, tripId } = useResolvedParams(params);        // long ids from ReferenceProvider
  if (!isTripSection(section)) return <Navigate params={{ section: 'board', tripId: params.tripId }} replace to="/trips/$tripId/$section" />;
  return <TripDetailView section={section} tripId={tripId as Id<'trips'>} tripReference={params.tripId} />;
}
```

Source: [`routes/`](../../../apps/web/src/routes),
[`_workspace.trips.$tripId.$section.tsx`](../../../apps/web/src/routes/_workspace.trips.$tripId.$section.tsx),
[`conventions.ts`](../../../tooling/quality/conventions.ts#L312).

## Workspace provider and group switch

`_workspace.tsx` nests `WorkspaceProvider`, `ReferenceProvider` and
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

Source: [`workspace-context.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-context.tsx#L25),
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
  navigate({ to: canonicalPath, search: true, hash: true, replace: true });
```

Source: [`reference-provider.tsx`](../../../apps/web/src/features/workspace/workspace-shell/reference-provider.tsx),
[`use-reference-params.ts`](../../../apps/web/src/features/workspace/hooks/use-reference-params.ts),
[`navigation/`](../../../apps/web/src/features/workspace/navigation),
[`resolve.ts`](../../../packages/backend/convex/routes/references/resolve.ts).

## Shell-owned behaviour

`WorkspaceShell` composes `packages/ui` layout primitives (`SidebarProvider`,
`useSidebar`) with product behaviour: the sidebar, the reference-gated outlet,
mobile navigation, the assistant widget (keyed and error-bounded by
organization id), shared workspace dialogs and the command palette.

```tsx
<SidebarProvider><ConfirmDialogProvider>
  <WorkspaceSidebar />
  <ReferenceContent><Outlet /></ReferenceContent><MobileNavigation />
  <WorkspaceAssistantWidget organizationId={activeOrganization.id} />
  <WorkspaceDialogs />  {/* create-organization | invite | join */}  <CommandPalette />
</ConfirmDialogProvider></SidebarProvider>
```

Source: [`workspace-shell.tsx`](../../../apps/web/src/features/workspace/workspace-shell/workspace-shell.tsx),
[`sidebar.tsx`](../../../packages/ui/src/components/sidebar.tsx).

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

Board moves use Convex `withOptimisticUpdate` on the cached issue list; slow,
non-undoable board actions (start or apply an idea) wait for the server and
run one at a time. A sent chat message shows a pending bubble keyed
`optimistic-user-N` until a message key outside the pre-send baseline arrives.
Poll selection keeps a pending choice only while the latest vote is in flight.

```ts
moveMutation.withOptimisticUpdate((store, args) => {
  const issues = store.getQuery(api.routes.trips.issues.list.run, { tripId });
  if (issues) store.setQuery(api.routes.trips.issues.list.run, { tripId }, applyIssueMove(issues, args));
});
function withPendingUserMessage(messages, pending, threadId) {
  if (!pending || pending.threadId !== threadId) return messages;
  if (messages.some((m) => !pending.baselineKeys.has(m.key))) return messages;   // server copy arrived
  return [...messages, { key: pending.key, status: 'pending', author: { name: 'You', userId: 'pending' } }];
}
```

Source: [`use-trip-board-moves.ts`](../../../apps/web/src/features/trips/hooks/use-trip-board-moves.ts#L28),
[`use-discussion-thread.ts`](../../../apps/web/src/features/discussions/hooks/use-discussion-thread.ts#L234),
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

A page calls `useSetAgentContext` with a serializable `AgentScreenContext`
(`key`, `title`, `description`, `data`, `capabilities`, optional trip
`target`). The provider keeps registrations in order and exposes the latest;
unmounting restores the previous one. Registration reruns only when the JSON
serialization changes. Senders pass `serializeAgentScreenContext(context)` as
`screen`; the backend validates it with `AssistantScreens.validate` and stores
it on the run. The snapshot informs the agent; tools still authorize on the
server.

```ts
const serialized = JSON.stringify(context);
useEffect(() => {
  if (serialized === previous.current) return;
  cleanup.current?.();
  cleanup.current = context ? registry.register(token, context) : null;   // unregister → last remaining ?? null
  previous.current = serialized;
});
// discussion-send.ts
if (result.assistantAgent && context)
  respondAction({ discussionId, promptMessageId: result.messageId, screen: serializeAgentScreenContext(context) });
```

Source: [`agent-context.tsx`](../../../packages/ai/src/ui/context/agent-context.tsx#L40),
[`agent-screen-context.ts`](../../../packages/ai/src/ui/context/agent-screen-context.ts),
[`use-trip-agent-context.ts`](../../../apps/web/src/features/trips/hooks/use-trip-agent-context.ts),
[`discussion-send.ts`](../../../apps/web/src/features/discussions/hooks/discussion-send.ts).

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
- Route files stay thin:
  [`conventions.test.ts`](../../../tooling/quality/conventions.test.ts).
- Optimistic moves touch only a loaded list; slow board actions run one at a
  time:
  [`use-trip-board-moves.test.tsx`](../../../apps/web/src/features/trips/hooks/use-trip-board-moves.test.tsx).
- A pending chat message yields to the server copy:
  [`use-discussion-thread.test.tsx`](../../../apps/web/src/features/discussions/hooks/use-discussion-thread.test.tsx).
- The latest screen context wins and the parent returns on unmount:
  [`agent-context.test.tsx`](../../../packages/ai/src/ui/context/agent-context.test.tsx).

## Extending

- New page: one route file plus a feature view
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
