import type { Id } from '@groam/backend/data-model';
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useTripSectionCounts } from '@/features/trips/hooks/use-trip-section-counts';
import { tripSectionConfig, tripTabSections } from '@/features/trips/trip-sections';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { TabCounts, TripTabSection } from '@/types/trips';

/** What a section's count means, for the row's accessible name. */
function countMeaning(section: TripTabSection, count: number, counts: TabCounts) {
  if (isQueueSection(section)) {
    return `${count} ${counts[section]?.waiting ? 'waiting on you' : 'open'}`;
  }
  if (section === 'research') return `${count} unread`;
  return String(count);
}

const queueSections = ['ideas', 'issues', 'polls'] as const;

function isQueueSection(section: TripTabSection): section is (typeof queueSections)[number] {
  return queueSections.some((queue) => queue === section);
}

function sectionCount(section: TripTabSection, counts: TabCounts) {
  if (isQueueSection(section)) return counts[section]?.count;
  return section === 'research' ? counts[section] : undefined;
}

/** Only a count of what waits on the viewer is a filled primary pill; the others stay muted text. */
function countWaiting(section: TripTabSection, counts: TabCounts) {
  return isQueueSection(section) && counts[section]?.waiting === true;
}

const waitingPillClassName =
  'rounded-full bg-primary px-2 text-[11px] tabular-nums text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-[active=true]/menu-button:text-primary-foreground';

/** The trip's sections as sidebar rows, with a count where the section has one worth showing. */
export function TripSidebarSectionItems({
  active,
  archived = false,
  reference,
  tripId
}: {
  /** The section on screen, or null when the route is not this trip. */
  active: TripTabSection | null;
  /** The trip is archived, so nothing in Ideas or Issues waits on the viewer. */
  archived?: boolean;
  /** The trip as links write it: the URL's own reference on its page, else its short id. */
  reference: string;
  tripId: Id<'trips'>;
}) {
  const { setOpenMobile } = useSidebar();
  const counts = useTripSectionCounts(tripId, archived);
  return tripTabSections.map((section) => {
    const { icon: Icon, label } = tripSectionConfig[section];
    const count = sectionCount(section, counts) || undefined;
    return (
      <SidebarMenuItem key={section}>
        <SidebarMenuButton
          asChild
          className={count === undefined ? undefined : 'pr-8'}
          isActive={active === section}
          tooltip={label}
        >
          <Link
            aria-current={active === section ? 'page' : undefined}
            aria-label={
              count === undefined ? undefined : `${label}, ${countMeaning(section, count, counts)}`
            }
            data-section={section}
            data-testid={testIds.sidebarTripSection}
            onClick={() => setOpenMobile(false)}
            params={{ section, tripId: reference }}
            // Switching sections keeps the page frame, so a view transition adds nothing; when a quick
            // second click interrupts one, the browser rejects it with "Transition was skipped".
            to="/trips/$tripId/$section"
            viewTransition={false}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
        {count === undefined ? null : (
          <SidebarMenuBadge
            aria-hidden
            className={
              countWaiting(section, counts) ? waitingPillClassName : 'text-sidebar-foreground/60'
            }
          >
            {count}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  });
}
