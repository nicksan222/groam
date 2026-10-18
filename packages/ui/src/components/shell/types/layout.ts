import type React from 'react';
import type { ReactNode } from 'react';
import type { EmptyScreenProps } from '#tsx/components/empty-screen';

export interface ShellProps {
  children: ReactNode;
  className?: string;
}

export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export interface FooterProps {
  children: ReactNode;
  className?: string;
}

export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  hideOnMobile?: boolean;
}

export interface DescriptionProps {
  children: ReactNode;
  className?: string;
  suppressHydrationWarning?: boolean;
  'data-testid'?: string;
}

export interface BackProps {
  href?: string;
  onClick?: () => void;
  /** When true and no href/onClick, falls back to `window.history.back()`. Defaults to true. */
  goBack?: boolean;
}

export interface ContentProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyProps?: Omit<EmptyScreenProps, 'headline'>;
  errorProps?: Omit<EmptyScreenProps, 'headline' | 'description'>;
  /** If true, removes all padding for full-bleed content (e.g., embedded chat) */
  noPadding?: boolean;
}
