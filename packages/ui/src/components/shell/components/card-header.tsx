'use client';

import { cn } from '@groam/ui/lib/utils';
import type { CardHeaderProps } from '#src/components/shell/types/banner';
import { shellCardHeaderVariants } from '#src/lib/shell-card';

/** Header band inside `Shell.Card` (filled panels, editors, etc.). */
const CardHeader = ({
  as: Component = 'div',
  children,
  className,
  density = 'compact',
  ...props
}: CardHeaderProps) => (
  <Component
    className={cn(shellCardHeaderVariants({ density }), className)}
    data-density={density}
    data-slot="shell-card-header"
    {...props}
  >
    {children}
  </Component>
);

export default CardHeader;
