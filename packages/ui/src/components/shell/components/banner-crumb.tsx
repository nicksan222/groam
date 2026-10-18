'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerCrumbProps } from '#src/components/shell/types/banner';
import { SHELL_BANNER_CRUMB, SHELL_PAGE_INSET } from '#src/lib/shell-layout';

/** Breadcrumb row with standard inset and vertical rhythm inside `Shell.Banner`. */
const BannerCrumb: React.FC<BannerCrumbProps> = ({ children, className, ...props }) => (
  <div className={cn(SHELL_PAGE_INSET, SHELL_BANNER_CRUMB, className)} {...props}>
    {children}
  </div>
);

export default BannerCrumb;
