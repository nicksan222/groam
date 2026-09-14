'use client';

import { cn } from '@groam/ui/lib/utils';
import { createContext, useContext } from 'react';
import type {
  SplitAsideProps,
  SplitMainProps,
  SplitProps
} from '#src/components/shell/types/banner';
import {
  type ShellSplitBreakpoint,
  shellSplitAsideClassName,
  shellSplitClassName,
  shellStackClassName
} from '#src/lib/shell-layout';

const SplitBreakpointContext = createContext<ShellSplitBreakpoint>('xl');

/** @deprecated Use Shell.TwoColumns with Shell.LeftColumn and Shell.RightColumn. */
const Split = ({
  asideWidth = 'md',
  breakpoint = 'xl',
  children,
  className,
  gap = 'lg',
  ...props
}: SplitProps) => (
  <SplitBreakpointContext.Provider value={breakpoint}>
    <div
      className={shellSplitClassName({ asideWidth, breakpoint, className, gap })}
      data-slot="shell-split"
      {...props}
    >
      {children}
    </div>
  </SplitBreakpointContext.Provider>
);

const Main = ({ as: Component = 'div', children, className, stack, ...props }: SplitMainProps) => (
  <Component
    className={
      stack ? shellStackClassName({ className, stack }) : cn('min-w-0 max-w-full', className)
    }
    data-slot="shell-split-main"
    {...props}
  >
    {children}
  </Component>
);

const Aside = ({
  as: Component = 'aside',
  breakpoint: breakpointProp,
  children,
  className,
  mobileDivider = false,
  order,
  stack,
  sticky = false,
  ...props
}: SplitAsideProps) => {
  const inheritedBreakpoint = useContext(SplitBreakpointContext);
  const breakpoint = breakpointProp ?? inheritedBreakpoint;

  return (
    <Component
      className={shellSplitAsideClassName({
        breakpoint,
        className,
        mobileDivider,
        order,
        stack,
        sticky
      })}
      data-slot="shell-split-aside"
      {...props}
    >
      {children}
    </Component>
  );
};

const SplitRoot = Object.assign(Split, { Aside, Main });

export default SplitRoot;
