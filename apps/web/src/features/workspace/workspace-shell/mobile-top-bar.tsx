import { OPEN_ASSISTANT_EVENT } from '@groam/ai/ui/chat/ai-assistant-widget';
import { Menu, Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useCurrentTrip } from '@/features/trips/hooks/use-current-trip';
import { pageTitle } from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { useLocation, useParams } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';

/**
 * The phone's app bar: the menu button opens the sidebar sheet, the middle names the trip (or the
 * page off a trip), and the sparkle opens the assistant. From `md` up the sidebar is always there.
 */
export function MobileTopBar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const { onTripRoute, trip } = useCurrentTrip();
  // An issue's or an idea's own page (`/issues/:id`, `/ideas/:id`) belongs to a trip without naming it in the URL.
  const { issueId, proposalId } = useParams<{ issueId: string; proposalId: string }>();
  const tripScoped = onTripRoute || Boolean(issueId) || Boolean(proposalId);
  if (!isMobile) return null;

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 bg-background px-2"
      data-testid={testIds.mobileTopBar}
    >
      <Button
        aria-label="Open menu"
        data-testid={testIds.mobileMenu}
        onClick={() => setOpenMobile(true)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Menu />
      </Button>
      <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">
        {tripScoped && trip ? trip.name : pageTitle(pathname)}
      </p>
      <Button
        aria-label="Open Groam AI"
        onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Sparkles />
      </Button>
    </header>
  );
}
