import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@groam/ui/components/sidebar';
import { cn } from '@groam/ui/lib/utils';
import { Archive, ExternalLink, Link2, MoreHorizontal, Star } from 'lucide-react';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { CanonicalLink } from '@/features/workspace/navigation/router';

const ACTION_BUTTON_CLASS =
  'top-1/2 right-0.5 size-5 -translate-y-1/2 text-muted-foreground/45 transition-opacity duration-150 hover:bg-transparent hover:text-muted-foreground data-[state=open]:opacity-100 md:opacity-0 md:group-hover/trip-item:opacity-100 md:group-focus-within/trip-item:opacity-100 [&>svg]:size-3.5';

export function TripSidebarRow({
  active,
  menuOpen,
  onArchive,
  onCopyLink,
  onFavorite,
  onMenuOpenChange,
  onOpen,
  onOpenMobile,
  pending,
  trip
}: {
  active: boolean;
  menuOpen: boolean;
  onArchive: () => void;
  onCopyLink: () => void;
  onFavorite: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: (section: 'overview') => void;
  onOpenMobile: () => void;
  pending: boolean;
  trip: TripListItem;
}) {
  const title = trip.destination ? `${trip.name} · ${trip.destination}` : trip.name;

  return (
    <SidebarMenuSubItem
      className={cn(
        'group/trip-item relative',
        trip.favorite &&
          'before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-foreground/55'
      )}
    >
      <SidebarMenuSubButton asChild className="pr-7" isActive={active}>
        <CanonicalLink
          onClick={onOpenMobile}
          params={{ section: 'overview', tripId: trip.shortId ?? trip.id }}
          title={trip.favorite ? `Favourite · ${title}` : title}
          to="/trips/$tripId/$section"
        >
          <span className={cn('truncate', trip.favorite && 'font-medium tracking-tight')}>
            {trip.name}
          </span>
        </CanonicalLink>
      </SidebarMenuSubButton>
      <DropdownMenu onOpenChange={onMenuOpenChange} open={menuOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            aria-label={`Actions for ${trip.name}`}
            className={ACTION_BUTTON_CLASS}
            disabled={pending}
            title="Trip actions"
          >
            <MoreHorizontal strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44" side="right">
          <DropdownMenuItem disabled={pending} onSelect={onFavorite}>
            <Star className={trip.favorite ? 'fill-current' : undefined} />
            {trip.favorite ? 'Remove favourite' : 'Favourite'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onOpen('overview')}>
            <ExternalLink />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyLink}>
            <Link2 />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onSelect={onArchive} variant="destructive">
            <Archive />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuSubItem>
  );
}
