// Show the contextual assistant on planning and coordination surfaces. Agent
// monitoring, existing chats, administration, and unknown routes stay focused.
// Idea and issue pages have no index of their own; only their detail pages carry it.
const assistantRoutes = ['/trips', '/inbox'] as const;
const assistantDetailRoutes = ['/ideas/', '/issues/'] as const;

export function isWorkspaceAssistantVisible(pathname: string): boolean {
  return (
    pathname === '/' ||
    assistantRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    assistantDetailRoutes.some((route) => pathname.startsWith(route))
  );
}
