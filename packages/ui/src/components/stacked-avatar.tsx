import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export type StackedAvatarFace = {
  alt: string;
  fallback: string;
  /** Extra classes for the initials, e.g. a per-person hue. */
  fallbackClassName?: string;
  src?: string | null;
};

const sizeClass = {
  md: { face: 'size-8', frame: 'size-12', single: 'text-sm', stacked: 'text-[11px]' },
  sm: { face: 'size-6', frame: 'size-9', single: 'text-xs', stacked: 'text-[9px]' }
} as const;

export type StackedAvatarProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  faces: StackedAvatarFace[];
  /** The second face's ring takes the surface the mark sits on, so it reads as cut out of it. */
  ringClassName?: string;
  size?: keyof typeof sizeClass;
};

/** One face, or the first two offset on a diagonal inside a square frame. */
function StackedAvatar({
  className,
  faces,
  ringClassName = 'ring-background',
  size = 'md',
  ...props
}: StackedAvatarProps) {
  const primary = faces[0];
  const secondary = faces[1];
  const classes = sizeClass[size];
  const fallback = (face: StackedAvatarFace | undefined, text: string) => (
    <AvatarFallback className={cn('font-semibold tracking-normal', text, face?.fallbackClassName)}>
      {face?.fallback ?? ''}
    </AvatarFallback>
  );

  if (primary && secondary) {
    return (
      <span
        className={cn('relative block shrink-0', classes.frame, className)}
        data-slot="stacked-avatar"
        {...props}
      >
        <Avatar className={cn('absolute top-0 left-0', classes.face)}>
          <AvatarImage alt={primary.alt} src={primary.src ?? ''} />
          {fallback(primary, classes.stacked)}
        </Avatar>
        <Avatar className={cn('absolute right-0 bottom-0 ring-2', ringClassName, classes.face)}>
          <AvatarImage alt={secondary.alt} src={secondary.src ?? ''} />
          {fallback(secondary, classes.stacked)}
        </Avatar>
      </span>
    );
  }

  return (
    <span
      className={cn('block shrink-0', classes.frame, className)}
      data-slot="stacked-avatar"
      {...props}
    >
      <Avatar className="size-full">
        <AvatarImage alt={primary?.alt ?? ''} src={primary?.src ?? ''} />
        {fallback(primary, classes.single)}
      </Avatar>
    </span>
  );
}

export { StackedAvatar };
