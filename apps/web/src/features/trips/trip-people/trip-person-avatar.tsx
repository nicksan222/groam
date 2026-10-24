import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { avatarClasses, initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import type { TripTraveler } from '@/types/trips';

const SIZES = {
  card: 'size-10 text-sm',
  lg: 'size-11 text-base',
  md: 'size-7 text-[11px]',
  sm: 'size-6 text-[10px]'
} as const;

/** A traveler's face, in the four sizes the manifest uses, tinted by their name. */
export function TripPersonAvatar({
  className,
  size,
  traveler
}: {
  className?: string;
  size: keyof typeof SIZES;
  traveler: Pick<TripTraveler, 'image' | 'name'>;
}) {
  return (
    <Avatar aria-hidden className={cn('shrink-0', SIZES[size], className)}>
      <AvatarImage alt="" src={traveler.image ?? ''} />
      <AvatarFallback className={cn('text-[length:inherit]', avatarClasses(traveler.name))}>
        {initials(traveler.name)}
      </AvatarFallback>
    </Avatar>
  );
}
