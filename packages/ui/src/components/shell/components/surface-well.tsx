'use client';

import { cn } from '@groam/ui/lib/utils';
import type { SurfaceWellProps } from '#src/components/shell/types/banner';
import { SHELL_SURFACE_WELL } from '#src/lib/shell-layout';

/** Bordered surface well for hints, notices, and contained property blocks. */
const SurfaceWell = ({
  as: Component = 'div',
  children,
  className,
  ...props
}: SurfaceWellProps) => (
  <Component className={cn(SHELL_SURFACE_WELL, className)} {...props}>
    {children}
  </Component>
);

export default SurfaceWell;
