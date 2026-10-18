// Show the contextual assistant on planning and coordination surfaces. Agent
// monitoring, existing chats, administration, and unknown routes stay focused.
const assistantRoutes = ['/trips', '/ideas', '/issues', '/inbox'] as const;

export function isWorkspaceAssistantVisible(pathname: string): boolean {
  return (
    pathname === '/' ||
    assistantRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  );
}
