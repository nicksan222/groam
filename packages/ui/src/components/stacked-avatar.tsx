import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { cn } from '@groam/ui/lib/utils';

export type StackedAvatarFace = {
  alt: string;
  fallback: string;
  src?: string | null;
};

const sizeClass = {
  md: { avatar: 'size-8', frame: 'size-12', stackedText: 'text-[10px]', text: 'text-sm' },
  sm: { avatar: 'size-6', frame: 'size-9', stackedText: 'text-[9px]', text: 'text-xs' }
} as const;

export type StackedAvatarProps = {
  faces: StackedAvatarFace[];
  size?: keyof typeof sizeClass;
};

function StackedAvatar({ faces, size = 'md' }: StackedAvatarProps) {
  const primary = faces[0];
  const secondary = faces[1];
  const classes = sizeClass[size];

  if (primary && secondary) {
    return (
      <span className={cn('relative block shrink-0', classes.frame)} data-slot="stacked-avatar">
        <Avatar className={cn('absolute top-0 left-0 border-2 border-background', classes.avatar)}>
          <AvatarImage alt={primary.alt} src={primary.src ?? ''} />
          <AvatarFallback className={classes.stackedText}>{primary.fallback}</AvatarFallback>
        </Avatar>
        <Avatar
          className={cn('absolute right-0 bottom-0 border-2 border-background', classes.avatar)}
        >
          <AvatarImage alt={secondary.alt} src={secondary.src ?? ''} />
          <AvatarFallback className={classes.stackedText}>{secondary.fallback}</AvatarFallback>
        </Avatar>
      </span>
    );
  }

  return (
    <Avatar className={cn('shrink-0', classes.frame)} data-slot="stacked-avatar">
      <AvatarImage alt={primary?.alt ?? ''} src={primary?.src ?? ''} />
      <AvatarFallback className={classes.text}>{primary?.fallback ?? ''}</AvatarFallback>
    </Avatar>
  );
}

export { StackedAvatar };
