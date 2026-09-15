import type React from 'react';

export type TabPosition = 'side' | 'top' | 'sidebar';
export type TabVariant = 'pill' | 'underline';

export interface TabContainerProps {
  children?: React.ReactNode;
  position?: TabPosition;
  /** Visual style for tabs. `underline` matches GitHub-style flat tabs. */
  variant?: TabVariant;
  /** Custom content rendered at the top of the desktop sidebar. Only for `position="sidebar"`. */
  header?: React.ReactNode;
  /** Compact contextual content rendered above sidebar tabs on mobile. */
  mobileHeader?: React.ReactNode;
  /** Sidebar width on desktop in px. Defaults to 260. Only for `position="sidebar"`. */
  width?: number;
  /** Apply standard page horizontal inset. Defaults to true for top tabs. */
  pageInset?: boolean;
  className?: string;
  'data-testid'?: string;
}

export interface TabItemProps {
  title: string;
  description?: string;
  icon?: React.ReactNode | React.JSXElementConstructor<{ className?: string; size?: number }>;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  position?: TabPosition;
  variant?: TabVariant;
  /** Optional visual indicator (e.g., for unread) */
  showIndicator?: boolean;
  /** Optional indicator text, e.g., "New messages!" */
  indicatorText?: string;
  /** Indicator color */
  indicatorColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Indicator size */
  indicatorSize?: 'sm' | 'md' | 'lg';
  /** Whether the tab is disabled (shown but not clickable) */
  disabled?: boolean;
  /** Tooltip shown on hover when disabled */
  disabledTooltip?: string;
  'data-testid'?: string;
}
