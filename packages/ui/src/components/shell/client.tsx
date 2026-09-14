'use client';

import classNames from 'classnames';
import type React from 'react';

import { AutoLayoutWrapper } from './auto-layout';
import { ShellProvider, ShellSlotsProvider } from './context';
import { type ShellComponent, shellSubcomponents } from './sub-components';
import type { ShellProps } from './types';

const ShellBase: React.FC<ShellProps> = ({ children, className }) => (
  <ShellProvider>
    <ShellSlotsProvider>
      <div
        data-slot="shell"
        className={classNames(
          'bg-canvas relative w-full max-w-[100vw] min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden',
          className
        )}
      >
        <AutoLayoutWrapper>{children}</AutoLayoutWrapper>
      </div>
    </ShellSlotsProvider>
  </ShellProvider>
);

/**
 * App layout root with slot-based subcomponents (`Shell.Header`, `Shell.Content`,
 * `Shell.TabContainer`, etc.). Children register into layout slots regardless of
 * nesting depth; wrap the app tree once near the route outlet.
 */
const Shell: ShellComponent = Object.assign(ShellBase, shellSubcomponents);

export default Shell;
