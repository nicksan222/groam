export const SIDEBAR_NESTED_LIST_CLASS = 'mx-0 ml-3.5 mr-0 border-l px-1.5 pr-0';

/** Count pill on collapsed/expanded sidebar nav items (inbox, agents, …). */
export const SIDEBAR_COUNT_BADGE_CLASS =
  'ml-auto h-5 min-w-5 px-1.5 text-[10px] tabular-nums group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:ml-0';

export function sidebarSectionToggleLabel(label: string, open: boolean) {
  return open ? `Collapse ${label}` : `Expand ${label}`;
}
