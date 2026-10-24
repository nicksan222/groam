'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerLayoutProps } from '#src/components/shell/types/banner';
import { SHELL_DOCK_LIFT_COMPOSER } from '#src/lib/shell-layout';
import Content from './content';

/**
 * Page root: the header and the `Shell.PageBody` beneath it share one scrolling pane. `dockLift`
 * is for a page whose body ends in a pinned composer: the phone action dock floats above it.
 */
const BannerLayout: React.FC<BannerLayoutProps> = ({ children, className, dockLift }) => (
  <Content className={cn(dockLift && SHELL_DOCK_LIFT_COMPOSER, className)}>{children}</Content>
);

export default BannerLayout;
