import type { ReactNode } from 'react';

export type ActionVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

export interface ActionProps {
  text?: string;
  icon?: ReactNode;
  variant?: ActionVariant;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Numeric position for ordering actions. Lower numbers render earlier. */
  position?: number;
  isDisabled?: boolean;
  disabledTooltip?: string;
  /**
   * If true this action is rendered with the compact icon-only style
   * on every breakpoint (mobile & desktop).
   */
  forceMobile?: boolean;
  'data-testid'?: string;
}
