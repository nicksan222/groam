import { Check, Map as MapIcon, Plus, Star } from '@groam/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { SidebarMenuItem } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { defaultTripSection } from '@/features/trips/trip-sections';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { CurrentTrip, TripTabSection } from '@/types/trips';
import { TripSwitcherActions } from './trip-switcher-actions';
import { TripSwitcherGroupMenu } from './trip-switcher-group-menu';
import { TripSwitcherTrigger } from './trip-switcher-trigger';
import { TripThumbnail } from './trip-thumbnail';

/** How many favourite and recently updated trips the menu lists. */
export const TRIP_SWITCHER_LIMIT = 8;

/** Choose the sidebar's trip; picking one keeps the section the traveler is on. */
export function TripSwitcher({
  isLoading,
  reference,
  section,
  trip,
  trips
}: {
  isLoading: boolean;
  /** How the current trip is written in links; used to copy its link. */
  reference: string | null;
  /** The shared-trip section on screen; picking another trip opens the same one. */
  section: TripTabSection | null;
  trip: CurrentTrip;
  /** Favourites first, then by recent update, as the server lists them. */
  trips: TripListItem[];
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const openDialog = useWorkspaceDialogs((state) => state.openDialog);
  const { activeOrganization, activeRole } = useWorkspace();
  const listed = trips.slice(0, TRIP_SWITCHER_LIMIT);
  const favourites = listed.filter((item) => item.favorite);
  const recent = listed.filter((item) => !item.favorite);

  const go = (action: () => void) => {
    setOpenMobile(false);
    action();
  };
  const renderTrip = (item: TripListItem) => (
    <DropdownMenuItem
      className="gap-3"
      data-testid={testIds.tripSwitcherItem}
      data-trip-name={item.name}
      key={item.id}
      onSelect={() =>
        go(
          () =>
            void navigate({
              params: { section: section ?? defaultTripSection, tripId: item.shortId ?? item.id },
              to: '/trips/$tripId/$section'
            })
        )
      }
      title={item.name}
    >
      <TripThumbnail coverUrl={item.coverUrl} name={item.name} size="item" />
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate font-medium">{item.name}</span>
        {item.destination ? (
          <span className="truncate text-xs text-muted-foreground">{item.destination}</span>
        ) : null}
      </span>
      {item.id === trip?.id ? (
        <Check aria-label="Current trip" className="ml-auto shrink-0 text-primary" />
      ) : null}
    </DropdownMenuItem>
  );

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TripSwitcherTrigger
            data-group-name={activeOrganization.name}
            groupName={activeOrganization.name}
            groupRole={activeRole}
            isLoading={isLoading}
            trip={trip}
          />
        </DropdownMenuTrigger>
        {/* Beside the sidebar on a desktop; under the card in the phone sheet, where there is no room beside it. */}
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-72 md:w-80"
          side={isMobile ? 'bottom' : 'right'}
          sideOffset={isMobile ? 4 : 12}
        >
          {favourites.length > 0 ? (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Star className="size-3 fill-current" /> Favourites
              </DropdownMenuLabel>
              {favourites.map(renderTrip)}
            </>
          ) : null}
          {recent.length > 0 ? (
            <>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Recent
              </DropdownMenuLabel>
              {recent.map(renderTrip)}
            </>
          ) : null}
          {listed.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            data-testid={testIds.navTrips}
            onSelect={() => go(() => void navigate({ to: '/trips' }))}
          >
            <MapIcon /> All trips
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid={testIds.tripSwitcherNew}
            onSelect={() => go(() => openDialog('create-trip'))}
          >
            <Plus /> New trip
          </DropdownMenuItem>
          {trip && reference ? (
            <TripSwitcherActions
              favorite={trips.find((item) => item.id === trip.id)?.favorite}
              reference={reference}
              trip={trip}
            />
          ) : null}
          <TripSwitcherGroupMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
