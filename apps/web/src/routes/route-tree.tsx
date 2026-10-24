import { PageLoading } from '@groam/ui/components/page-loading';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
  useRouter
} from '@tanstack/react-router';
import type { ComponentType } from 'react';
import ChatLayout from '#pages/(workspace)/chat/layout';
import WorkspaceLayout from '#pages/(workspace)/layout';
import { RouteNotFound } from '@/features/errors/route-error/route-not-found';
import { routerBasepath } from '@/lib/navigation/base-path';
import type { AppRouterContext } from '@/types/navigation';

/** Query strings stay plain strings; `useSearch` parsers turn them into typed values. */
function parseQuery(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search));
}

function stringifyQuery(search: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** Providers and session gating around every page; the page is the router's outlet. */
function RootLayout() {
  const { renderRoot } = useRouter().options.context as AppRouterContext;
  return renderRoot(<Outlet />);
}

function WorkspaceOutlet() {
  return (
    <WorkspaceLayout>
      <Outlet />
    </WorkspaceLayout>
  );
}

function ChatOutlet() {
  return (
    <ChatLayout>
      <Outlet />
    </ChatLayout>
  );
}

function RoutePending() {
  return <PageLoading label="Loading…" />;
}

const page = (load: () => Promise<{ default: ComponentType }>) => lazyRouteComponent(load);

function buildRouteTree() {
  const root = createRootRouteWithContext<AppRouterContext>()({
    component: RootLayout,
    notFoundComponent: RouteNotFound
  });
  // The signed-in shell: a pathless layout that stays mounted while its pages change.
  const workspace = createRoute({
    component: WorkspaceOutlet,
    getParentRoute: () => root,
    id: 'workspace'
  });
  const at = (path: string, load: () => Promise<{ default: ComponentType }>) =>
    createRoute({ component: page(load), getParentRoute: () => workspace, path });

  // The chat list stays mounted beside whichever discussion is open.
  const chat = createRoute({
    component: ChatOutlet,
    getParentRoute: () => workspace,
    path: '/chat'
  });
  const chatChildren = [
    createRoute({
      component: page(() => import('#pages/(workspace)/chat-inbox')),
      getParentRoute: () => chat,
      path: '/'
    }),
    createRoute({
      component: page(() => import('#pages/(workspace)/discussion-thread')),
      getParentRoute: () => chat,
      path: '$discussionId'
    })
  ];

  return root.addChildren([
    workspace.addChildren([
      at('/', () => import('#pages/(workspace)/dashboard')),
      at('/agents/$agentId', () => import('#pages/(workspace)/agent-detail')),
      at('/agents/$agentId/$runId', () => import('#pages/(workspace)/agent-run')),
      chat.addChildren(chatChildren),
      at('/ideas/$proposalId', () => import('#pages/(workspace)/idea-detail')),
      at('/inbox', () => import('#pages/(workspace)/inbox')),
      at('/issues/$issueId', () => import('#pages/(workspace)/issue-detail')),
      at('/settings', () => import('#pages/(workspace)/settings-index')),
      at('/settings/$section', () => import('#pages/(workspace)/settings-section')),
      at('/trips', () => import('#pages/(workspace)/trip-list')),
      at('/trips/$tripId', () => import('#pages/(workspace)/trip-index')),
      at('/trips/$tripId/$section', () => import('#pages/(workspace)/trip-section')),
      at('/trips/$tripId/ideas/$proposalId', () => import('#pages/(workspace)/idea-clone-index')),
      at(
        '/trips/$tripId/ideas/$proposalId/$view',
        () => import('#pages/(workspace)/idea-clone-section')
      ),
      at('/trips/$tripId/research/$researchId', () => import('#pages/(workspace)/research-thread'))
    ])
  ]);
}

/**
 * The app's router. Pages are client-mounted (Convex owns data and sessions in the browser), so
 * nothing loads or renders on a server. Journeys pass their own history and `renderRoot`.
 */
export function createAppRouter({
  history,
  renderRoot
}: AppRouterContext & { history?: RouterHistory }) {
  const router = createRouter({
    basepath: routerBasepath(),
    context: { renderRoot },
    defaultPendingComponent: RoutePending,
    defaultPreload: 'intent',
    defaultViewTransition: true,
    history,
    parseSearch: parseQuery,
    routeTree: buildRouteTree(),
    scrollRestoration: true,
    stringifySearch: stringifyQuery
  });
  router.startViewTransition = (update) => startHandledViewTransition(router, update);
  return router;
}

/**
 * TanStack's transition starter returns only `updateCallbackDone`. A transition that a newer
 * navigation skips, or whose DOM update times out, also rejects `ready` and `finished`, which
 * nothing awaits; mark them handled so a skipped animation never surfaces as an error.
 */
function startHandledViewTransition(
  router: { options: { defaultViewTransition?: unknown }; shouldViewTransition?: unknown },
  update: () => Promise<void>
) {
  const enabled = router.shouldViewTransition ?? router.options.defaultViewTransition;
  router.shouldViewTransition = undefined;
  if (!enabled || typeof document.startViewTransition !== 'function') return update();
  const transition = document.startViewTransition(update);
  transition.ready.catch(() => undefined);
  transition.finished.catch(() => undefined);
  return transition.updateCallbackDone;
}
