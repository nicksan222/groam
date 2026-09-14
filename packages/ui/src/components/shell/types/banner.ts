import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import type { ElementType, ReactNode } from 'react';
import type {
  ShellCardBodyPadding,
  ShellCardFooterDensity,
  ShellCardHeaderDensity,
  ShellCardPadding,
  ShellCardStack,
  ShellCardVariant,
  ShellEyebrowTone
} from '#src/lib/shell-card';
import type {
  ShellPageBodyVariant,
  ShellSectionStack,
  ShellSplitAsideWidth,
  ShellSplitBreakpoint,
  ShellSplitGap,
  ShellSplitSticky,
  ShellStackDensity
} from '#src/lib/shell-layout';

export interface BannerLayoutProps {
  children: ReactNode;
  className?: string;
}

export interface BannerProps extends React.HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export interface BannerInsetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export interface BannerCrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export interface BannerHeroProps extends BannerInsetProps {}

export interface BannerHeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
  titleTestId?: string;
}

export interface PageBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  innerInset?: boolean;
  maxWidthClassName?: string;
  variant?: ShellPageBodyVariant;
}

export interface SurfaceWellProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

export interface NoticeBannerProps extends Omit<SurfaceWellProps, 'children' | 'title'> {
  action?: ReactNode;
  description: ReactNode;
  detail?: ReactNode;
  icon: LucideIcon;
  title: ReactNode;
}

export interface SectionHeaderProps {
  badge?: string;
  density?: 'compact' | 'default';
  description?: ReactNode;
  icon?: LucideIcon;
  /** Skeleton title/description while section content loads. */
  isLoading?: boolean;
  title?: ReactNode;
  trailing?: ReactNode;
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  stack?: ShellSectionStack;
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

export interface SplitProps extends React.HTMLAttributes<HTMLDivElement> {
  asideWidth?: ShellSplitAsideWidth;
  breakpoint?: ShellSplitBreakpoint;
  children: ReactNode;
  className?: string;
  gap?: ShellSplitGap;
}

export interface SplitMainProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stack?: ShellStackDensity;
}

export interface SplitAsideProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  breakpoint?: ShellSplitBreakpoint;
  className?: string;
  mobileDivider?: boolean;
  order?: 'first' | 'none';
  stack?: ShellStackDensity;
  sticky?: ShellSplitSticky;
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
