import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { avatarClasses, initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';

/** A trip's cover as a small square; a trip without one gets a tinted tile with its initial. */
export function TripThumbnail({
  coverUrl,
  name,
  size
}: {
  coverUrl: string | null;
  name: string;
  size: 'item' | 'trigger';
}) {
  return (
    <Avatar
      className={cn(
        'shrink-0 ring-1 ring-sidebar-foreground/10',
        size === 'trigger'
          ? 'size-10 rounded-lg group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md'
          : 'size-8 rounded-md'
      )}
    >
      <AvatarImage alt="" className="object-cover" src={coverUrl ?? ''} />
      <AvatarFallback
        className={cn(
          'rounded-[inherit] font-semibold',
          size === 'trigger' ? 'text-sm' : 'text-xs',
          avatarClasses(name)
        )}
      >
        {initials(name).slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
