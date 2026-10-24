import { ChevronsUpDown, Plane } from '@groam/icons';
import { IconTile } from '@groam/ui/components/icon-tile';
import { SidebarMenuButton } from '@groam/ui/components/sidebar';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps } from 'react';
import { dayCountLabel } from '@/features/trips/trip-duration';
import { windowValue } from '@/features/trips/trip-overview/trip-window-value';
import { testIds } from '@/lib/test-ids';
import type { CurrentTrip } from '@/types/trips';
import { TripThumbnail } from './trip-thumbnail';

/** When the trip is: its dates, else its date notes, else its length. The place is Plan's to say. */
function tripDetail(trip: NonNullable<CurrentTrip>) {
  return (
    windowValue(trip) ??
    (trip.totalDurationDays === null ? null : dayCountLabel(trip.totalDurationDays))
  );
}

/** "Owner", "Admin", "Member": the role as the menu writes it. */
export function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * The sidebar's title: a card with the current trip's cover, its name on one line (a long one ends
 * in an ellipsis; the full name is its tooltip) and when it is; with no trip it is dashed and
 * invites a choice. Icon-collapsed it is the cover alone. The group is part of its accessible name
 * and leads the bottom of its menu.
 */
export function TripSwitcherTrigger({
  className,
  groupName,
  groupRole,
  isLoading,
  trip,
  ...props
}: Omit<ComponentProps<typeof SidebarMenuButton>, 'children'> & {
  groupName: string;
  groupRole: string;
  isLoading: boolean;
  trip: CurrentTrip;
}) {
  const name = trip?.name ?? (isLoading ? 'Loading trip…' : 'Choose a trip');
  const detail = trip ? tripDetail(trip) : isLoading ? null : 'Pick a trip to see its sections';
  return (
    <SidebarMenuButton
      className={cn(
        'h-auto min-h-14 items-center gap-3 rounded-xl border p-2 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none',
        trip || isLoading
          ? 'border-sidebar-border bg-background shadow-xs hover:border-sidebar-ring/40 hover:bg-background data-[state=open]:border-sidebar-ring/50 data-[state=open]:bg-background data-[state=open]:hover:bg-background'
          : 'border-dashed border-sidebar-foreground/30 bg-transparent',
        className
      )}
      data-testid={testIds.tripSwitcher}
      data-trip-name={trip?.name}
      size="lg"
      tooltip={`${name} · ${groupName}`}
      {...props}
    >
      {trip ? (
        <TripThumbnail coverUrl={trip.coverUrl} name={trip.name} size="trigger" />
      ) : (
        <IconTile
          className="bg-sidebar-accent text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md"
          size="lg"
          variant="plain"
        >
          <Plane aria-hidden className="size-4" />
        </IconTile>
      )}
      <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
        <span
          className={cn(
            'truncate text-sm leading-5 font-semibold tracking-[-0.01em]',
            trip ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
          )}
          title={name}
        >
          {name}
        </span>
        {detail ? (
          <span className="truncate text-xs leading-tight text-sidebar-foreground">{detail}</span>
        ) : null}
        <span className="sr-only" data-slot="trip-switcher-group">
          {groupName} · {roleLabel(groupRole)}
        </span>
      </span>
      <ChevronsUpDown
        aria-hidden
        className="ml-auto size-4 self-center text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden"
      />
    </SidebarMenuButton>
  );
}
