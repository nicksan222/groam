import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@groam/ui/components/alert-dialog';
import {
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { SidebarNestedLoadMore } from '@groam/ui/components/sidebar-nested-load-more';
import { toast } from '@groam/ui/components/toast';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Map as MapIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTripSidebarActions } from '@/features/trips/hooks/use-trip-sidebar-actions';
import { type TripListItem, useTrips } from '@/features/trips/hooks/use-trips';
import { useTripsSidebarUi } from '@/features/trips/hooks/use-trips-sidebar-ui';
import { CreateTripDialog } from '@/features/trips/trip-create/create-trip-dialog';
import { TripSidebarRow } from '@/features/trips/trip-list/trip-sidebar-row';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { Link, useParams } from '@/features/workspace/navigation/router';
import {
  orderSidebarItems,
  SIDEBAR_NESTED_PAGE_SIZE
} from '@/features/workspace/workspace-sidebar/sidebar-nested-nav';
import { testIds } from '@/lib/test-ids';

export function TripsSidebarNav() {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const {
    closeCreate,
    isArchiveOpen,
    isCreateOpen,
    menuTripId,
    onArchiveOpenChange,
    onMenuOpenChange,
    openCreate,
    requestArchive,
    tripToArchive
  } = useTripsSidebarUi();
  const { archiveTrip, pendingTripId, toggleFavorite } = useTripSidebarActions();

  const activeTripId = typeof params.tripId === 'string' ? params.tripId : null;
  const tripsIndexActive = pathname === '/trips' || pathname === '/trips/';
  const [sectionOpen, setSectionOpen] = useSidebarSectionOpen('trips');
  const { createTrip, isLoading, loadMore, status, trips } = useTrips(
    sectionOpen ? { includeArchived: false, initialNumItems: SIDEBAR_NESTED_PAGE_SIZE } : 'skip'
  );
  const sortedTrips = useMemo(() => orderSidebarItems(trips), [trips]);
  const canLoadMore = status === 'CanLoadMore' || status === 'LoadingMore';

  return (
    <>
      <SidebarCollapsibleItem
        label="trips"
        onOpenChange={setSectionOpen}
        open={sectionOpen}
        trigger={
          <SidebarMenuButton asChild isActive={tripsIndexActive} tooltip="Trips">
            <Link data-testid={testIds.navTrips} onClick={() => setOpenMobile(false)} to="/trips">
              <MapIcon />
              <span>Trips</span>
            </Link>
          </SidebarMenuButton>
        }
      >
        {isLoading ? (
          <>
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
          </>
        ) : sortedTrips.length === 0 ? (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton onClick={openCreate}>
              <span>New trip</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ) : (
          <>
            {sortedTrips.map((trip) => (
              <TripSidebarRow
                active={activeTripId === trip.id}
                key={trip.id}
                menuOpen={menuTripId === trip.id}
                onArchive={() => requestArchive(trip)}
                onCopyLink={() => void copyTripLink(trip)}
                onFavorite={() => void toggleFavorite(trip.id, trip.favorite)}
                onMenuOpenChange={(open) => onMenuOpenChange(trip.id, open)}
                onOpen={(section) => {
                  setOpenMobile(false);
                  void navigate({
                    params: { section, tripId: trip.id },
                    to: '/trips/$tripId/$section'
                  });
                }}
                onOpenMobile={() => setOpenMobile(false)}
                pending={pendingTripId === trip.id}
                trip={trip}
              />
            ))}
            {canLoadMore && (
              <SidebarNestedLoadMore
                isLoadingMore={status === 'LoadingMore'}
                onLoadMore={() => loadMore(SIDEBAR_NESTED_PAGE_SIZE)}
              />
            )}
          </>
        )}
      </SidebarCollapsibleItem>
      <AlertDialog onOpenChange={onArchiveOpenChange} open={isArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive{tripToArchive ? ` ${tripToArchive.name}` : ' this trip'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It will become read-only until restored. Destinations, discussions, and planning
              details are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!tripToArchive) return;
                void archiveTrip(tripToArchive.id);
              }}
            >
              Archive trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isCreateOpen && (
        <CreateTripDialog
          createTrip={createTrip}
          onClose={closeCreate}
          onCreated={(tripId) => {
            closeCreate();
            setOpenMobile(false);
            void navigate({
              params: { section: 'overview', tripId },
              to: '/trips/$tripId/$section'
            });
          }}
        />
      )}
    </>
  );
}

async function copyTripLink(trip: TripListItem) {
  const url = new URL(
    `/trips/${trip.shortId ?? trip.id}/overview`,
    window.location.origin
  ).toString();
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Trip link copied');
  } catch {
    toast.error('Unable to copy trip link');
  }
}
