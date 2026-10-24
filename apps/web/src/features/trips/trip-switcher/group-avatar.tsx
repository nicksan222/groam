import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';

/** A group's logo, else its initial, as a small rounded tile in the trip switcher's menu. */
export function GroupAvatar({ logo, name }: { logo: string | null | undefined; name: string }) {
  return (
    <Avatar className="size-8 shrink-0 rounded-md">
      <AvatarImage alt="" src={logo ?? ''} />
      <AvatarFallback className="rounded-md bg-muted text-xs font-semibold text-foreground">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
