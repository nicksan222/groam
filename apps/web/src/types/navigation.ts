import type { ComponentProps, ReactNode } from 'react';

/** Every workspace route as written in links; each is a route in apps/web/src/routes. */
export type AppPath =
  | '/'
  | '/agents/$agentId'
  | '/agents/$agentId/$runId'
  | '/chat'
  | '/chat/$discussionId'
  | '/ideas/$proposalId'
  | '/inbox'
  | '/issues/$issueId'
  | '/settings'
  | '/settings/$section'
  | '/trips'
  | '/trips/$tripId'
  | '/trips/$tripId/$section'
  | '/trips/$tripId/ideas/$proposalId'
  | '/trips/$tripId/ideas/$proposalId/$view'
  | '/trips/$tripId/research/$researchId';

/** The `$param` names in a route path. */
export type PathParams<Path extends string> = Path extends `${string}$${infer Name}/${infer Rest}`
  ? Name | PathParams<`/${Rest}`>
  : Path extends `${string}$${infer Name}`
    ? Name
    : never;

/** A typed link destination: the route, its params, and an optional query and hash. */
export type RouteTarget = {
  [Path in AppPath]: {
    hash?: string;
    search?: Record<string, boolean | number | string | null | undefined>;
    to: Path;
  } & ([PathParams<Path>] extends [never]
    ? { params?: Record<string, never> }
    : { params: Record<PathParams<Path>, string> });
}[AppPath];

export type NavigateOptions = {
  preserveScroll?: boolean;
  replace?: boolean;
  viewTransition?: boolean;
};

export type NavigateTarget = RouteTarget & NavigateOptions;

export type LinkProps = RouteTarget & NavigateOptions & Omit<ComponentProps<'a'>, 'href'>;

/** Props of a layout route component: the page (and inner layouts) it wraps. */
export type LayoutProps = { children: ReactNode };

/** What the root route renders around the matched page; journeys supply their own client. */
export type AppRouterContext = { renderRoot: (page: ReactNode) => ReactNode };
