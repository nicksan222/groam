import type { Icon } from '@groam/icons';
import type React from 'react';
import type { ElementType, ReactNode } from 'react';
import type {
  ShellCardBodyPadding,
  ShellCardFooterDensity,
  ShellCardHeaderDensity,
  ShellCardPadding,
  ShellCardStack,
  ShellCardVariant,
  ShellEyebrowSize,
  ShellEyebrowTone
} from '#src/lib/shell-card';
import type { ShellPageLayout, ShellStackDensity } from '#src/lib/shell-layout';

export interface BannerLayoutProps {
  children: ReactNode;
  className?: string;
  /** The body ends in a pinned composer: lift the phone action dock above it (`SHELL_DOCK_LIFT_COMPOSER`). */
  dockLift?: boolean;
}

export interface PageBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** Pad the bottom enough to clear the phone bottom nav and safe area. */
  clearNav?: boolean;
  layout?: ShellPageLayout;
}

export interface SurfaceWellProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

export interface SectionHeaderProps {
  badge?: string;
  density?: 'compact' | 'default';
  description?: ReactNode;
  icon?: Icon;
  /** Skeleton title/description while section content loads. */
  isLoading?: boolean;
  title?: ReactNode;
  trailing?: ReactNode;
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  stack?: ShellStackDensity;
}

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  stack?: ShellCardStack;
}

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stack?: ShellStackDensity;
}

export interface UnderlineNavProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  'aria-label': string;
  children: ReactNode;
  className?: string;
  pageInset?: boolean;
}

export type PropertyGridItem = {
  label: string;
  numeric?: boolean;
  value: ReactNode;
};

export interface PropertyGridProps extends Omit<SurfaceWellProps, 'children'> {
  items?: readonly PropertyGridItem[];
  /** Skeleton fact rows while values load. */
  isLoading?: boolean;
  /** Number of skeleton rows when `isLoading` (default 4). */
  loadingCount?: number;
  /** Keep row labels visible while only values load. */
  loadingLabels?: readonly string[];
}

export interface ShellCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  asChild?: boolean;
  children: ReactNode;
  className?: string;
  padding?: ShellCardPadding;
  reveal?: boolean;
  stack?: ShellCardStack;
  variant?: ShellCardVariant;
}

export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  size?: ShellEyebrowSize;
  /** Semibold instead of medium. */
  strong?: boolean;
  tone?: ShellEyebrowTone;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  density?: ShellCardHeaderDensity;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  padding?: ShellCardBodyPadding;
  stack?: ShellStackDensity;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  density?: ShellCardFooterDensity;
}
