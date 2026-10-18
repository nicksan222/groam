'use client';

import { useColumnsBreakpoint } from '#src/components/shell/context/use-columns-breakpoint';
import type { DesktopRightColumnProps } from '#src/components/shell/types/columns';
import { type ShellSplitBreakpoint, shellSplitAsideClassName } from '#src/lib/shell-layout';

const desktopVisibility: Record<ShellSplitBreakpoint, string> = {
  lg: 'hidden lg:block',
  md: 'hidden md:block',
  xl: 'hidden xl:block'
};

/** Supporting content that is visible only when TwoColumns reaches its desktop breakpoint. */
export default function DesktopRightColumn({
  as: Component = 'aside',
  children,
  ...props
}: DesktopRightColumnProps) {
  const breakpoint = useColumnsBreakpoint();
  return (
    <Component
      className={[
        shellSplitAsideClassName({ breakpoint, stack: 'lg', sticky: 'near' }),
        desktopVisibility[breakpoint]
      ].join(' ')}
      data-slot="shell-desktop-right-column"
      {...props}
    >
      {children}
    </Component>
  );
}
