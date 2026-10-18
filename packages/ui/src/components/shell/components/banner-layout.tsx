'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerLayoutProps } from '#src/components/shell/types/banner';
import Content from './content';

/**
 * Full-bleed tabbed page root: unpadded shell content with zero vertical gap between
 * the sticky banner and scrolling body.
 */
const BannerLayout: React.FC<BannerLayoutProps> = ({ children, className }) => (
  <Content className={cn('gap-0', className)} noPadding>
    {children}
  </Content>
);

export default BannerLayout;
