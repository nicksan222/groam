import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { avatarClasses, displayInitials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';

/** A traveler's photo, or tinted initials when they have none. Decorative: the name sits beside it. */
export function PackingPersonAvatar({
  className,
  image,
  name
}: {
  className?: string;
  image?: string | null;
  name: string;
}) {
  return (
    <Avatar aria-hidden className={cn('size-5', className)}>
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback className={cn('text-[9px] font-medium', avatarClasses(name))}>
        {displayInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
